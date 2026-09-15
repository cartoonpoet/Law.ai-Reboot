import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  AiChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  DashboardBriefRequest,
  DashboardBriefResponse,
  TenantContext,
  TenantRole,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { ApprovalsService } from "../approvals/approvals.service";
import {
  ACTIVE_CONTRACT_STATUSES,
  ASSIGNEE_ROLES,
  ASSIGNER_ROLES,
  MAX_HISTORY_MESSAGES,
  buildAssistantSystemPrompt,
  buildBriefSystemPrompt,
  getContextSignature,
} from "./assistant-context";
import type { AssistantContext } from "./assistant-context";
import { parseAssistantReply, parseBriefReply } from "./assistant-reply";

// 업무 데이터가 그대로면 이 시간 동안 같은 브리핑을 다시 쓴다(대시보드를 열 때마다 유료 AI 호출 방지).
const BRIEF_CACHE_MS = 30 * 60 * 1000;

interface BriefCacheEntry {
  signature: string;
  expiresAt: number;
  response: DashboardBriefResponse;
}

const MAX_CONTEXT_CONTRACTS = 40;
const MAX_ASSIGNEES = 50;
const MAX_MESSAGE_LENGTH = 2000;

const SETUP_REPLY: AssistantChatResponse = {
  reply: "AI 비서를 쓰려면 먼저 내 AI 연동(API 키)을 설정해 주세요. 설정은 시스템 관리 화면에서 할 수 있어요.",
  actions: [{ type: "open", label: "AI 설정하러 가기", path: "/system" }],
  needsSetup: true,
};

// RPC 경계를 넘어온 에러는 Error 가 아닐 수 있다(직렬화된 { message } 객체 등).
const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "알 수 없는 오류";
};

// 최근 대화만, 빈 메시지 제거, 너무 긴 메시지는 자른다.
const sanitizeMessages = (messages: AiChatMessage[]): AiChatMessage[] =>
  messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }));

@Injectable()
export class AssistantService {
  // 사용자(테넌트)별 최근 브리핑 — 프로세스 메모리. 서버가 재시작되면 비워지고 다음 조회 때 다시 만든다.
  private readonly briefCache = new Map<string, BriefCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
    private readonly approvals: ApprovalsService,
  ) {}

  /** AI 비서 대화 — 내 AI 연동 키로, 내가 볼 수 있는 업무 데이터만 넘겨 답하고 행동은 검증된 제안만 돌려준다. */
  async chat(req: AssistantChatRequest): Promise<AssistantChatResponse> {
    const viewerId = req.viewerId;
    const ctx = req.tenantContext;
    if (!viewerId || !ctx) {
      throw new RpcException({ status: 401, message: "인증이 필요합니다" });
    }
    const messages = sanitizeMessages(req.messages ?? []);
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      throw new RpcException({ status: 400, message: "보낼 메시지가 없습니다" });
    }

    const credential = await this.credentials.getDecryptedKeyFor(viewerId);
    if (!credential) return SETUP_REPLY;

    const context = await this.loadContext(viewerId, ctx);
    const system = buildAssistantSystemPrompt({
      context,
      screen: (req.screen ?? "").slice(0, 50) || "Law.ai",
      today: new Date().toISOString().slice(0, 10),
    });

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({ model: credential.model, apiKey: credential.apiKey, system, messages }));
    } catch (err) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${getErrorMessage(err)}` });
    }
    return parseAssistantReply(content, context);
  }

  /** 대시보드 AI 브리핑 — 내 업무 데이터로 오늘 챙길 일을 정리. 데이터가 그대로면 30분간 캐시를 쓴다. */
  async brief(req: DashboardBriefRequest): Promise<DashboardBriefResponse> {
    const viewerId = req.viewerId;
    const ctx = req.tenantContext;
    if (!viewerId || !ctx) {
      throw new RpcException({ status: 401, message: "인증이 필요합니다" });
    }
    const generatedAt = new Date().toISOString();

    const credential = await this.credentials.getDecryptedKeyFor(viewerId);
    if (!credential) {
      return { headline: "AI 브리핑을 보려면 먼저 내 AI 연동(API 키)을 설정해 주세요.", points: [], needsSetup: true, generatedAt };
    }

    const context = await this.loadContext(viewerId, ctx);
    if (context.contracts.length === 0 && context.approvals.length === 0) {
      return { headline: "지금 처리할 계약이나 결재가 없어요.", points: [], needsSetup: false, generatedAt };
    }

    const cacheKey = `${ctx.tenantId ?? "all"}:${viewerId}`;
    const signature = getContextSignature(context);
    const cached = this.briefCache.get(cacheKey);
    if (!req.refresh && cached && cached.signature === signature && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system: buildBriefSystemPrompt({ context, today: generatedAt.slice(0, 10) }),
        messages: [{ role: "user", content: "오늘 브리핑을 만들어 주세요." }],
      }));
    } catch (err) {
      throw new RpcException({ status: 502, message: `AI 브리핑을 받지 못했어요: ${getErrorMessage(err)}` });
    }

    const { headline, points, isValid } = parseBriefReply(content, context);
    const response: DashboardBriefResponse = { headline, points, needsSetup: false, generatedAt };
    if (isValid) {
      this.briefCache.set(cacheKey, { signature, expiresAt: Date.now() + BRIEF_CACHE_MS, response });
    }
    return response;
  }

  private async loadRole(viewerId: string, ctx: TenantContext): Promise<TenantRole> {
    // 시스템 관리자는 계약 권한 평가에서 사내 법무와 같게 본다(contracts.service loadViewer 와 동일).
    if (ctx.isSystemAdmin) return "inHouseCounsel";
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId: ctx.tenantId } });
    return membership?.role ?? "general";
  }

  private async loadContext(viewerId: string, ctx: TenantContext): Promise<AssistantContext> {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: viewerId }, select: { name: true } }),
      this.loadRole(viewerId, ctx),
    ]);
    const canAssign = ASSIGNER_ROLES.includes(role);

    const [contractRows, inbox, assigneeRows] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          deletedAt: null,
          ...tenantScope(ctx),
          status: { in: ACTIVE_CONTRACT_STATUSES },
          // 내가 담당·요청·작성한 계약 + 배정 권한이 있으면 미배정 계약
          OR: [
            { ownerId: viewerId },
            { requesterId: viewerId },
            { createdById: viewerId },
            ...(canAssign ? [{ status: "unassigned" as const }] : []),
          ],
        },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          dueDate: true,
          ownerId: true,
          requesterId: true,
          createdById: true,
          owner: { select: { name: true } },
          requester: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_CONTEXT_CONTRACTS,
      }),
      this.approvals.inbox({ viewerId, tenantContext: ctx }),
      canAssign && ctx.tenantId
        ? this.prisma.userTenant.findMany({
            where: { tenantId: ctx.tenantId, role: { in: ASSIGNEE_ROLES } },
            select: { user: { select: { id: true, name: true, department: { select: { name: true } } } } },
            take: MAX_ASSIGNEES,
          })
        : Promise.resolve([]),
    ]);

    return {
      viewer: { id: viewerId, name: user?.name ?? "사용자", role, canAssign },
      contracts: contractRows.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        status: c.status,
        dueDate: c.dueDate?.toISOString() ?? null,
        ownerId: c.ownerId,
        ownerName: c.owner?.name ?? null,
        requesterName: c.requester?.name ?? null,
        relations: [
          c.ownerId === viewerId ? "담당" : null,
          c.requesterId === viewerId ? "요청" : null,
          c.createdById === viewerId ? "작성" : null,
          c.status === "unassigned" && canAssign ? "배정대상" : null,
        ].filter((r): r is string => r !== null),
      })),
      approvals: inbox.pending.map((a) => ({
        lineId: a.lineId,
        contractId: a.targetType === "contract" ? a.targetId : null,
        title: a.title,
        submittedByName: a.submittedByName,
        step: `${a.myStepOrder + 1}/${a.totalSteps}`,
      })),
      assignees: assigneeRows.map((m) => ({ id: m.user.id, name: m.user.name, dept: m.user.department?.name ?? "" })),
    };
  }
}
