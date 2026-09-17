import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import type {
  AddAdviceMessageRequest,
  AdviceDetails,
  AdviceMessageKindTypes,
  AdvicePerson,
  AdviceRef,
  AdviceResponse,
  AdviceStatusTypes,
  AdviceSummary,
  AssignAdviceRequest,
  CloseAdviceRequest,
  CreateAdviceRequest,
  GetAdviceRequest,
  ListAdvicesRequest,
  ListAdvicesResponse,
  TenantContext,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTenantId, tenantScope } from "../common/tenant-scope";
import {
  checkCanSeeSecretCc,
  checkCanView,
  checkLegalRole,
  checkOwnerRole,
  getAdvicePermissions,
  type AdviceAuthzTarget,
  type AdviceViewer,
} from "./advices.authz";

const NOT_FOUND_MESSAGE = "자문을 찾을 수 없습니다";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CODE_RETRY_LIMIT = 3;

const ADVICE_STATUSES: AdviceStatusTypes[] = ["received", "reviewing", "waitingRequester", "answered", "closed"];

// 메시지 종류별로 할 수 있는 사람과 남긴 뒤의 상태.
const MESSAGE_RULES: Record<
  AdviceMessageKindTypes,
  { permission: "canFollowup" | "canReply" | "canAnswer"; nextStatus: AdviceStatusTypes; deniedMessage: string }
> = {
  followup: { permission: "canFollowup", nextStatus: "waitingRequester", deniedMessage: "추가 질의는 담당자만 할 수 있습니다" },
  reply: { permission: "canReply", nextStatus: "reviewing", deniedMessage: "답변은 요청자만 남길 수 있습니다" },
  answer: { permission: "canAnswer", nextStatus: "answered", deniedMessage: "회신은 담당자만 할 수 있습니다" },
};

type AdviceRow = Prisma.AdviceGetPayload<{ include: { messages: true } }>;
type AdviceBaseRow = Omit<AdviceRow, "messages">;

// 관리번호: ADV-{YYYY}-{4자리}. 겹치면 호출부에서 다시 만든다(unique 제약).
const generateCode = (now: Date): string =>
  `ADV-${now.getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

const requireText = (value: string | null | undefined, message: string): string => {
  const text = value?.trim() ?? "";
  if (text.length === 0) throw new RpcException({ status: 400, message });
  return text;
};

// 에디터 HTML 이 태그만 남고 글자가 없으면 빈 값으로 본다.
const requireRichText = (html: string, message: string): string => {
  const text = html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() ?? "";
  if (text.length === 0) throw new RpcException({ status: 400, message });
  return html.trim();
};

const parseDueDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RpcException({ status: 400, message: "회신 기한 형식이 올바르지 않습니다" });
  return date;
};

const parseStatuses = (raw?: string): AdviceStatusTypes[] =>
  (raw ?? "")
    .split(",")
    .map((status) => status.trim())
    .filter((status): status is AdviceStatusTypes => ADVICE_STATUSES.includes(status as AdviceStatusTypes));

// 사람·부서·프로젝트 선택값 — id·name 이 문자열인 것만 남기고 다른 속성은 버린다.
const toRef = (value: unknown): AdviceRef | null => {
  const ref = value as Partial<AdviceRef> | null;
  return typeof ref?.id === "string" && typeof ref?.name === "string" ? { id: ref.id, name: ref.name } : null;
};

const toRefs = (value: unknown): AdviceRef[] =>
  Array.isArray(value) ? value.map(toRef).filter((ref): ref is AdviceRef => ref !== null) : [];

// 화면이 보낸 값·DB 에 저장된 값 모두 같은 모양으로 맞춘다.
const toDetails = (value: unknown): AdviceDetails => {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    ccUsers: toRefs(raw.ccUsers),
    ccDepts: toRefs(raw.ccDepts),
    ccSecret: toRefs(raw.ccSecret),
    project: toRef(raw.project),
    counterparty: typeof raw.counterparty === "string" ? raw.counterparty.trim() : "",
  };
};

const toAuthzTarget = (row: AdviceBaseRow): AdviceAuthzTarget => ({
  status: row.status,
  requesterId: row.requesterId,
  createdById: row.createdById,
  ownerId: row.ownerId,
  ccUserIds: toDetails(row.details).ccUsers.map((user) => user.id),
});

const checkUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/**
 * 법률자문 — 요청(접수) · 조회 · 담당 배정 · 질의/회신 · 종결.
 * 상태 전이는 메시지를 남기는 행동에 묶여 있다(추가 질의 → 답변 대기, 답변 → 검토, 회신 → 회신 완료).
 */
@Injectable()
export class AdvicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateAdviceRequest): Promise<AdviceResponse> {
    const tenantId = resolveTenantId(req.tenantContext);
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const title = requireText(req.title, "자문명을 입력해 주세요");
    if (req.categories.length === 0) throw new RpcException({ status: 400, message: "자문분류를 하나 이상 선택해 주세요" });
    if (req.countries.length === 0) throw new RpcException({ status: 400, message: "국가를 선택해 주세요" });
    await this.ensureMember(req.requesterId, tenantId, "자문요청자를 찾을 수 없습니다");
    if (req.ownerId) await this.ensureOwnerCandidate(req.ownerId, tenantId);

    const data = {
      title,
      status: (req.ownerId ? "reviewing" : "received") as AdviceStatusTypes,
      securityLevel: req.securityLevel,
      categories: req.categories,
      region: req.region,
      countries: req.countries,
      requesterId: req.requesterId,
      ownerId: req.ownerId,
      createdById: viewer.id,
      tenantId,
      background: requireRichText(req.background, "사안의 배경을 입력해 주세요"),
      question: requireRichText(req.question, "질의의 요지를 입력해 주세요"),
      etcRequest: req.etcRequest?.trim() || null,
      dueDate: parseDueDate(req.dueDate),
      details: toDetails(req.details) as unknown as Prisma.InputJsonValue,
    };

    const row = await this.createWithUniqueCode(data);
    return this.toResponse(row, viewer);
  }

  async list(req: ListAdvicesRequest): Promise<ListAdvicesResponse> {
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const page = Math.max(1, req.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, req.pageSize ?? DEFAULT_PAGE_SIZE));
    const q = req.q?.trim();
    const statuses = parseStatuses(req.statuses);

    // 상태를 뺀 조건 — 그룹 탭 건수는 이 조건으로 센다.
    const baseWhere: Prisma.AdviceWhereInput = {
      AND: [
        { deletedAt: null, ...tenantScope(req.tenantContext) },
        this.getVisibleWhere(viewer),
        req.mine ? this.getMineWhere(viewer) : {},
        req.category ? { categories: { has: req.category } } : {},
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };
    const where: Prisma.AdviceWhereInput =
      statuses.length > 0 ? { AND: [baseWhere, { status: { in: statuses } }] } : baseWhere;

    const [rows, total, grouped] = await Promise.all([
      this.prisma.advice.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.advice.count({ where }),
      this.prisma.advice.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    ]);

    const people = await this.loadPeople(rows.flatMap((row) => [row.requesterId, row.ownerId]));
    const counts = Object.fromEntries(ADVICE_STATUSES.map((status) => [status, 0])) as Record<AdviceStatusTypes, number>;
    grouped.forEach((group) => {
      counts[group.status] = group._count._all;
    });

    return { items: rows.map((row) => this.toSummary(row, people)), total, page, pageSize, counts };
  }

  async get(req: GetAdviceRequest): Promise<AdviceResponse> {
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const row = await this.loadVisible(req.id, req.tenantContext, viewer);
    return this.toResponse(row, viewer);
  }

  async assign(req: AssignAdviceRequest): Promise<AdviceResponse> {
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const current = await this.loadVisible(req.id, req.tenantContext, viewer);
    if (!getAdvicePermissions(viewer, toAuthzTarget(current)).canAssign) {
      throw new RpcException({ status: 403, message: "담당 배정 권한이 없습니다" });
    }
    await this.ensureOwnerCandidate(req.ownerId, current.tenantId);

    const row = await this.prisma.advice.update({
      where: { id: current.id },
      data: {
        ownerId: req.ownerId,
        // 접수 상태에서 담당이 정해지면 검토를 시작한다. 검토 중 담당 변경은 상태를 그대로 둔다.
        ...(current.status === "received" ? { status: "reviewing" } : {}),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return this.toResponse(row, viewer);
  }

  async addMessage(req: AddAdviceMessageRequest): Promise<AdviceResponse> {
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const current = await this.loadVisible(req.id, req.tenantContext, viewer);
    const rule = MESSAGE_RULES[req.kind];
    if (!rule) throw new RpcException({ status: 400, message: "알 수 없는 메시지 종류입니다" });
    if (!getAdvicePermissions(viewer, toAuthzTarget(current))[rule.permission]) {
      throw new RpcException({ status: 403, message: rule.deniedMessage });
    }
    const body = requireRichText(req.body, "내용을 입력해 주세요");

    const row = await this.prisma.advice.update({
      where: { id: current.id },
      data: {
        status: rule.nextStatus,
        // 회신하면 회신일을 남기고, 회신 뒤 다시 물으면 회신일을 비운다.
        answeredAt: req.kind === "answer" ? new Date() : req.kind === "reply" ? null : current.answeredAt,
        messages: { create: { authorId: viewer.id, kind: req.kind, body } },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return this.toResponse(row, viewer);
  }

  async close(req: CloseAdviceRequest): Promise<AdviceResponse> {
    const viewer = await this.loadViewer(req.viewerId, req.tenantContext);
    const current = await this.loadVisible(req.id, req.tenantContext, viewer);
    if (!getAdvicePermissions(viewer, toAuthzTarget(current)).canClose) {
      throw new RpcException({ status: 403, message: "회신이 끝난 자문만 요청자나 담당자가 종결할 수 있습니다" });
    }
    const row = await this.prisma.advice.update({
      where: { id: current.id },
      data: { status: "closed", closedAt: new Date() },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return this.toResponse(row, viewer);
  }

  private async createWithUniqueCode(data: Omit<Prisma.AdviceUncheckedCreateInput, "code">): Promise<AdviceRow> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.prisma.advice.create({
          data: { ...data, code: generateCode(new Date()) },
          include: { messages: true },
        });
      } catch (error) {
        if (!checkUniqueViolation(error) || attempt >= CODE_RETRY_LIMIT) throw error;
      }
    }
  }

  // 조회자 역할 — 시스템 관리자는 법무팀과 같은 범위로 본다.
  private async loadViewer(viewerId: string, ctx: TenantContext): Promise<AdviceViewer> {
    if (ctx.isSystemAdmin) return { id: viewerId, role: "inHouseCounsel" };
    const membership = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      select: { role: true },
    });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
    return { id: viewerId, role: membership.role };
  }

  // 볼 권한이 없으면 있는지조차 알리지 않도록 404.
  private async loadVisible(id: string, ctx: TenantContext, viewer: AdviceViewer): Promise<AdviceRow> {
    const row = await this.prisma.advice.findFirst({
      where: { id, deletedAt: null, ...tenantScope(ctx) },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!row || !checkCanView(viewer, toAuthzTarget(row))) {
      throw new RpcException({ status: 404, message: NOT_FOUND_MESSAGE });
    }
    return row;
  }

  private getVisibleWhere(viewer: AdviceViewer): Prisma.AdviceWhereInput {
    if (checkLegalRole(viewer.role)) return {};
    if (viewer.role === "outsideCounsel") return { ownerId: viewer.id };
    return {
      OR: [
        { requesterId: viewer.id },
        { createdById: viewer.id },
        { ownerId: viewer.id },
        { details: { path: ["ccUsers"], array_contains: [{ id: viewer.id }] } },
      ],
    };
  }

  private getMineWhere(viewer: AdviceViewer): Prisma.AdviceWhereInput {
    if (checkOwnerRole(viewer.role)) return { ownerId: viewer.id };
    return { OR: [{ requesterId: viewer.id }, { createdById: viewer.id }] };
  }

  private async ensureMember(userId: string, tenantId: string, message: string): Promise<void> {
    const membership = await this.prisma.userTenant.findFirst({ where: { userId, tenantId }, select: { id: true } });
    if (!membership) throw new RpcException({ status: 400, message });
  }

  private async ensureOwnerCandidate(userId: string, tenantId: string): Promise<void> {
    const membership = await this.prisma.userTenant.findFirst({ where: { userId, tenantId }, select: { role: true } });
    if (!membership || !checkOwnerRole(membership.role)) {
      throw new RpcException({ status: 400, message: "담당자는 법무팀 또는 외부 변호사만 지정할 수 있습니다" });
    }
  }

  /** 이름·부서를 한 번에 조회(N+1 회피). */
  private async loadPeople(ids: (string | null)[]): Promise<Map<string, AdvicePerson>> {
    const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
    if (uniqueIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, department: { select: { name: true } } },
    });
    return new Map(users.map((user) => [user.id, { id: user.id, name: user.name, dept: user.department?.name ?? null }]));
  }

  private toSummary(row: AdviceBaseRow, people: Map<string, AdvicePerson>): AdviceSummary {
    const getPerson = (id: string): AdvicePerson => people.get(id) ?? { id, name: null, dept: null };
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      securityLevel: row.securityLevel,
      categories: row.categories,
      region: row.region,
      requester: getPerson(row.requesterId),
      owner: row.ownerId ? getPerson(row.ownerId) : null,
      dueDate: row.dueDate?.toISOString() ?? null,
      answeredAt: row.answeredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toResponse(row: AdviceRow, viewer: AdviceViewer): Promise<AdviceResponse> {
    const people = await this.loadPeople([
      row.requesterId,
      row.ownerId,
      row.createdById,
      ...row.messages.map((message) => message.authorId),
    ]);
    const target = toAuthzTarget(row);
    const details = toDetails(row.details);
    const getPerson = (id: string): AdvicePerson => people.get(id) ?? { id, name: null, dept: null };
    return {
      ...this.toSummary(row, people),
      countries: row.countries,
      background: row.background,
      question: row.question,
      etcRequest: row.etcRequest,
      details: checkCanSeeSecretCc(viewer, target) ? details : { ...details, ccSecret: [] },
      createdBy: getPerson(row.createdById),
      closedAt: row.closedAt?.toISOString() ?? null,
      messages: row.messages.map((message) => ({
        id: message.id,
        kind: message.kind,
        body: message.body,
        author: getPerson(message.authorId),
        createdAt: message.createdAt.toISOString(),
      })),
      permissions: getAdvicePermissions(viewer, target),
    };
  }
}
