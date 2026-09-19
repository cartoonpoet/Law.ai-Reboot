import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StatusEventsService } from "../common/status-events/status-events.service";
import { AuditService } from "./contracts.audit";
import { R2Client } from "../files/r2.client";
import { ApprovalsService } from "../approvals/approvals.service";
import { AiAnalysisService } from "../ai-analysis/ai-analysis.service";
import { ContractTextExtractor } from "../ai-analysis/contract-text.extractor";
import {
  buildPrecheckPayload,
  buildRiskPayload,
  buildSubmitBriefingPayload,
  buildApprovalBriefingPayload,
  buildRenewalTermsPayload,
} from "../ai-analysis/prompt-payloads";
import { evaluate } from "./contracts.authz";
import { getFileLockViolation } from "./contract-file-lock";
import type { AuthzViewer, AuthzContract } from "./contracts.authz";
import { tenantScope, resolveTenantId } from "../common/tenant-scope";
import { CATEGORY_LABEL_SEPARATOR } from "@lawai/contracts";
import type {
  CreateContractRequest,
  GetContractRequest,
  ContractResponse,
  ContractDetailsV1,
  Company,
  ListContractsRequest,
  ListContractsResponse,
  ContractSummary,
  UpdateContractRequest,
  UpdateContractStatusRequest,
  ContractStatus,
  TenantContext,
  ApprovalLineDto,
  ApproverSnapshot,
  SubmitContractApprovalRequest,
  SubmitContractApprovalResult,
  FileInput,
  CompleteSigningRequest,
  CompleteSigningResult,
  FinalizeRegistrationRequest,
  FinalizeRegistrationResult,
  ReplaceSignedFileRequest,
  ReplaceSignedFileResult,
  TerminateContractRequest,
  TerminateContractResult,
  AnalyzeRenewalTermsRequest,
  TerminationReason,
  ContractLinkRef,
  ContractStage,
  DeleteContractRequest,
  DeleteContractResult,
} from "@lawai/contracts";

// Prisma 가 counterparties + 결재선(단계 포함)을 include 한 Contract 행
const contractInclude = {
  requester: { select: { name: true } },
  owner: { select: { name: true } },
  counterparties: true,
  // 코멘트 첨부(File.commentId 가 있는 행)는 Comment 응답으로만 노출.
  // Contract.files 는 계약 본 파일만 — DocsCard 가 코멘트 첨부와 섞이지 않도록 같은 쿼리에서 분리.
  files: {
    where: { commentId: null },
    orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
  },
  references: { orderBy: [{ ccType: "asc" }, { isSecret: "asc" }] },
  // 원 계약·파생 계약(갱신·변경·해지) 요약 — 상세 화면의 "연결된 계약".
  originContract: { select: { id: true, code: true, title: true, status: true, details: true, deletedAt: true } },
  derivedContracts: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, title: true, status: true, details: true },
  },
} satisfies Prisma.ContractInclude;

// 연결된 계약 행 → 짧은 요약. stage 는 details(JSONB)에 있어 꺼내 온다.
const toContractLinkRef = (c: {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  details: Prisma.JsonValue;
}): ContractLinkRef => ({
  id: c.id,
  code: c.code,
  title: c.title,
  status: c.status,
  stage: ((c.details as { stage?: ContractStage } | null)?.stage ?? "new") as ContractStage,
});

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: typeof contractInclude;
}>;

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// PII 마스킹: 앞 일부만 남기고 숫자/문자를 가린다.
const maskDigits = (v: string | null): string | null => {
  if (!v) return v;
  if (v.length <= 3) return "***";
  return v.slice(0, 3) + v.slice(3).replace(/[0-9A-Za-z]/g, "*");
};

const maskEmail = (v: string | null): string | null => {
  if (!v) return v;
  const [user, domain] = v.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
};

// 상대회사 스냅샷의 PII(사업자번호·연락처) 마스킹. 이름·대표자·주소는 유지.
const maskCompany = (c: Company): Company => ({
  ...c,
  bizNo: maskDigits(c.bizNo) ?? c.bizNo,
  phone: maskDigits(c.phone),
  managerPhone: maskDigits(c.managerPhone),
  managerEmail: maskEmail(c.managerEmail),
});

// 중도 해지할 수 있는 상태 — 체결 이후 아직 끝나지 않은 계약.
const TERMINABLE_STATUSES: ContractStatus[] = ["signed", "fulfilling"];

// 원 계약이 반드시 있어야 하는 계약 단계(변경은 선택).
const ORIGIN_REQUIRED_STAGES: ReadonlySet<ContractStage> = new Set<ContractStage>(["renew", "terminate"]);

// 파생 계약이 체결되면 원 계약을 닫는 사유와 메모 이름. 변경 계약은 원 계약을 닫지 않는다.
const ORIGIN_CLOSE_BY_STAGE: Partial<Record<ContractStage, { reason: "renewed" | "terminated"; label: string }>> = {
  renew: { reason: "renewed", label: "갱신" },
  terminate: { reason: "terminated", label: "해지" },
};

// 중도 해지 사유 → 종료 메모 앞에 붙는 이름.
const TERMINATION_REASON_LABEL: Record<TerminationReason, string> = {
  agreement: "합의 해지",
  counterpartyBreach: "상대방 귀책",
  ourCircumstance: "당사 사정",
  other: "기타",
};

// 상태 전이 허용 맵(from → 허용 to[]).
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["unassigned"],
  unassigned: ["assigning", "legalReview"],
  assigning: ["legalReview"],
  legalReview: ["requesterReview", "reviewDone"],
  requesterReview: ["legalReview", "reviewDone"],
  // reviewDone → signing 은 이 맵에 두지 않는다 — signing 진입은 submitApproval() 전용이다
  // (결재 라인을 새로 만들면서 전이). 여기 두면 "signing 에서 승인된 라인 → reviewDone 으로
  // 되돌림 → 계약서 교체 → 상태 엔드포인트로 signing 복귀" 로 옛 승인을 다른 문서에 재사용해
  // completeSigning 을 통과시킬 수 있다(completeSigning 은 최신 라인만 본다).
  reviewDone: ["legalReview"],
  signing: ["signed", "reviewDone"],
  signed: ["fulfilling"],
  fulfilling: ["closed"],
  closed: [],
};

// 계약서 파일 교체 시 risk 재분석을 다시 돌릴 상태(spec §6). 법무 검토 루프 안에 있는
// 두 상태 — 이 구간에서는 첨부된 문서가 곧 검토 대상이라 문서가 바뀌면 기존 분석이 무효다.
// (requesterReview 는 legalReview 로 되돌아갈 수 있는 같은 루프의 반대편이다.)
const RISK_RECHECK_STATUSES: ContractStatus[] = ["legalReview", "requesterReview"];

// 계약서 파일이 붙거나 바뀔 때 사전 점검(precheck)을 돌릴 상태 — 화면(getActiveAiKind)이
// 사전 점검을 보여주는 검토 전 단계와 같다.
const PRECHECK_STATUSES: ContractStatus[] = ["draft", "unassigned"];

// list() 2단 상태 필터 검증용 — ALLOWED_TRANSITIONS 키가 전체 ContractStatus 를 이미 망라한다.
const VALID_STATUSES = new Set<string>(Object.keys(ALLOWED_TRANSITIONS));

const EXPIRY_WINDOW_DAYS: Record<"d7" | "d30" | "d90" | "d180", number> = { d7: 7, d30: 30, d90: 90, d180: 180 };
const DAY_MS = 86_400_000;

// 만료는 "체결 이후"에만 의미가 있다(옛 "체결계약 만료 현황" 메뉴를 흡수) — 검토 중인 계약은
// 만료 축 자체가 없다. status/statuses 로 이미 좁혀둔 값과 교집합하고, 아무 상태 필터가
// 없으면 이 셋 전체로 좁힌다.
const POST_SIGN_STATUSES: ContractStatus[] = ["signed", "fulfilling", "closed"];

// "signing,signed" → ["signing","signed"]. 미지원 상태 값이 섞여 있으면 400(전체 조회로 조용히
// 새는 것을 막는다 — 잘못된 필터가 "필터 없음"처럼 동작하면 발견하기 어려운 버그가 된다).
const parseStatusesParam = (raw: string): ContractStatus[] => {
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (values.length === 0 || values.some((v) => !VALID_STATUSES.has(v))) {
    throw new RpcException({ status: 400, message: "유효하지 않은 statuses 값입니다" });
  }
  return values as ContractStatus[];
};

// periodEnd 는 항상 "그날 00:00 UTC"로 저장된다("YYYY-MM-DD" 를 new Date() 에 넘기면 UTC 자정으로
// 파싱됨). 그런데 만료 판정 기준을 시:분:초가 계속 흐르는 현재 시각(now)으로 잡으면, 하루 안에서도
// 값이 흔들린다 — 예: KST 09:00(=UTC 00:00) 이후부터 "오늘 만료"인 계약이 조기에 expired 로
// 넘어가거나 90일 이내 창에서 빠진다. 오늘 자정(UTC)으로 고정해 하루 종일 같은 결과를 보장한다.
const getTodayStartUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// expiry → periodEnd where 절. d90/d180 은 [오늘 자정, 오늘 자정+N일], expired 는 (~, 오늘 자정).
const parseExpiryFilter = (
  expiry: string,
): NonNullable<Prisma.ContractWhereInput["periodEnd"]> => {
  const todayStart = getTodayStartUtc();
  if (expiry === "expired") return { lt: todayStart };
  // 클라이언트 문자열로 객체를 바로 찾으면 "toString" 같은 상속 키가 걸리므로 자기 키인지 먼저 확인한다.
  if (Object.hasOwn(EXPIRY_WINDOW_DAYS, expiry)) {
    const windowDays = EXPIRY_WINDOW_DAYS[expiry as keyof typeof EXPIRY_WINDOW_DAYS];
    return {
      gte: todayStart,
      lte: new Date(todayStart.getTime() + windowDays * DAY_MS),
    };
  }
  throw new RpcException({ status: 400, message: "유효하지 않은 expiry 값입니다" });
};

// role="contract"(계약서 본문) 파일이 실제로 교체됐는지 판정.
// 추가(신규 업로드) / 제거 / 다른 파일의 role 을 contract 로 승격 — 셋 다 "문서가 바뀜"으로 본다.
// 파일을 건드리지 않은 수정(제목/기간 등)이나 이름·정렬만 바뀐 경우는 false.
const isContractFileReplaced = (
  currentFiles: { id: string; role: string }[],
  nextFiles: FileInput[],
): boolean => {
  const currentContractIds = new Set(
    currentFiles.filter((f) => f.role === "contract").map((f) => f.id),
  );
  const nextContractIds = new Set(
    nextFiles
      .filter((f) => f.role === "contract")
      .map((f) => f.id)
      .filter((id): id is string => Boolean(id)),
  );
  const hasNewUpload = nextFiles.some((f) => f.role === "contract" && !f.id);
  const hasRemoved = [...currentContractIds].some((id) => !nextContractIds.has(id));
  const hasPromoted = [...nextContractIds].some((id) => !currentContractIds.has(id));
  return hasNewUpload || hasRemoved || hasPromoted;
};

// 관리번호: C{YYYYMMDD}-{4자리}. 충돌 시 호출부에서 재시도(unique 제약).
const generateCode = (): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `C${ymd}-${seq}`;
};

// references 중 ccType==="user" 인 행들의 refId(= cc 사용자 id) 배열을 추출.
const extractCcUserIds = (
  refs: { ccType: string; refId: string }[],
): string[] => refs.filter((r) => r.ccType === "user").map((r) => r.refId);

// 계약서 본문을 함께 넘기는 AI 분석 종류 → 입력 페이로드 빌더.
const CONTRACT_TEXT_PAYLOAD_BUILDERS = {
  precheck: buildPrecheckPayload,
  risk: buildRiskPayload,
  renewalTerms: buildRenewalTermsPayload,
} as const;
type ContractTextAnalysisKind = keyof typeof CONTRACT_TEXT_PAYLOAD_BUILDERS;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly r2: R2Client,
    private readonly approvals: ApprovalsService,
    private readonly aiAnalysis: AiAnalysisService,
    private readonly contractText: ContractTextExtractor,
    private readonly statusEvents: StatusEventsService,
  ) {}

  // 단계별 소요시간(업무 통계)을 재려고 상태가 바뀐 시각을 남긴다. 실패해도 계약 처리는 그대로 간다.
  private recordStatus(row: { id: string; tenantId: string; ownerId: string | null }, fromStatus: string | null, toStatus: string, actorId: string | null): void {
    void this.statusEvents.record({
      tenantId: row.tenantId,
      targetType: "contract",
      targetId: row.id,
      fromStatus,
      toStatus,
      ownerId: row.ownerId,
      actorId,
    });
  }

  // 계약서 원본 파일에서 본문을 뽑아 넣고 AI 분석을 트리거한다. 파일 다운로드·추출이 요청 응답을 붙잡지 않게
  // 전부 백그라운드(await 하지 않음) — 추출기는 실패해도 null, trigger 는 어떤 경우에도 reject 하지 않는다.
  private triggerWithContractText(params: {
    kind: ContractTextAnalysisKind;
    contract: ContractResponse;
    tenantId: string;
    triggeredByUserId: string;
  }): void {
    const { kind, contract, tenantId, triggeredByUserId } = params;
    // 스캔 PDF 는 분석을 요청한 사람의 AI 연동으로 읽는다(그 연동으로 비용 청구).
    void this.contractText
      .extract(contract.files, { ocrUserId: triggeredByUserId })
      .catch(() => null)
      .then((fileText) =>
        this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: contract.id,
          kind,
          tenantId,
          triggeredByUserId,
          payload: CONTRACT_TEXT_PAYLOAD_BUILDERS[kind](contract, fileText),
        }),
      );
  }

  // 갱신·변경·해지 요청의 원 계약 확인. 신규는 무시(null), 갱신·해지는 필수, 변경은 선택.
  // 원 계약은 같은 회사의 삭제 안 된 체결 완료·계약 이행 계약이어야 한다.
  private async resolveOriginContractId(req: CreateContractRequest, ctx: TenantContext): Promise<string | null> {
    const stage = req.details.stage;
    if (stage === "new") return null;
    if (!req.originContractId) {
      if (ORIGIN_REQUIRED_STAGES.has(stage)) {
        throw new RpcException({ status: 400, message: "갱신·해지 계약은 원 계약을 골라야 합니다" });
      }
      return null;
    }
    const origin = await this.prisma.contract.findFirst({
      where: { id: req.originContractId, deletedAt: null, ...tenantScope(ctx) },
      select: { status: true },
    });
    if (!origin) {
      throw new RpcException({ status: 400, message: "원 계약을 찾을 수 없습니다" });
    }
    if (!TERMINABLE_STATUSES.includes(origin.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "원 계약은 체결 완료·계약 이행 중인 계약만 고를 수 있습니다" });
    }
    return req.originContractId;
  }

  // 갱신·해지 계약이 체결되면 원 계약을 즉시 종료(갱신됨·중도 해지)한다. 원 계약이 이미 끝났거나 지워졌으면 그대로 둔다.
  private async closeOriginOnSigning(signed: ContractWithRelations, signedAt: Date, actorId: string): Promise<void> {
    const stage = (signed.details as { stage?: ContractStage } | null)?.stage;
    const close = stage ? ORIGIN_CLOSE_BY_STAGE[stage] : undefined;
    if (!close || !signed.originContractId) return;

    // 종료 전 상태를 먼저 읽어 둔다 — updateMany 는 바뀐 행을 돌려주지 않아 from 을 알 수 없다.
    // 통계용 조회라 실패해도 체결 처리를 깨면 안 된다(못 읽으면 기록만 건너뛴다).
    const origin = await this.prisma.contract
      .findFirst({
        where: { id: signed.originContractId, tenantId: signed.tenantId, deletedAt: null },
        select: { id: true, tenantId: true, ownerId: true, status: true },
      })
      .catch(() => null);

    const { count } = await this.prisma.contract.updateMany({
      where: {
        id: signed.originContractId,
        tenantId: signed.tenantId,
        deletedAt: null,
        status: { in: TERMINABLE_STATUSES },
      },
      data: {
        status: "closed",
        closedReason: close.reason,
        closedAt: signedAt,
        closedNote: `${close.label} 계약 ${signed.code} 체결로 종료`,
      },
    });
    if (count === 0) return;

    if (origin) this.recordStatus(origin, origin.status, "closed", actorId);

    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: signed.originContractId,
      actorId,
      tenantId: signed.tenantId,
      detail: {
        kind: "closedByDerivedContract",
        to: "closed",
        closedReason: close.reason,
        derivedContractId: signed.id,
        derivedCode: signed.code,
      },
    });
  }

  // viewer(role/departmentId) 조회. viewerId 없거나 사용자 미존재면 null(evaluate 안전 기본).
  // role 공급원: 활성 테넌트의 UserTenant.role(토큰 stale 방지). admin 은 inHouseCounsel 로 매핑.
  private async loadViewer(
    viewerId: string | undefined,
    ctx: TenantContext,
  ): Promise<AuthzViewer | null> {
    if (!viewerId) return null;
    if (ctx.isSystemAdmin) {
      // 시스템 admin 은 전권 — authz 상 전체 view 동급(inHouseCounsel 역할로 평가).
      const u = await this.prisma.user.findUnique({ where: { id: viewerId } });
      return u ? { id: u.id, role: "inHouseCounsel", departmentId: u.departmentId } : null;
    }
    const m = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      include: { user: { select: { departmentId: true } } },
    });
    return m ? { id: viewerId, role: m.role, departmentId: m.user.departmentId } : null;
  }

  // contractInclude row → 권한 평가용 AuthzContract.
  private toAuthzContract(row: ContractWithRelations): AuthzContract {
    return {
      createdById: row.createdById,
      ownerId: row.ownerId,
      requesterId: row.requesterId,
      ccUserIds: extractCcUserIds(row.references),
      status: row.status,
      securityLevel: row.securityLevel,
      departmentId: row.departmentId,
    };
  }

  // categoryId → 조상 체인을 따라 루트까지 올라가 전체 경로 라벨("대 > 중 > 소") 산출.
  // 트리가 작으므로(28노드) findMany 한 번으로 전체 로드 후 메모리에서 부모를 추적해 N+1 회피.
  // tenantScope(ctx) 를 where 에 합쳐 타 테넌트 카테고리를 조회하지 않도록 격리한다.
  private async resolveCategoryLabel(
    categoryId: string | null,
    ctx: TenantContext,
  ): Promise<string | null> {
    if (!categoryId) return null;
    const rows = await this.prisma.contractCategory.findMany({
      where: { ...tenantScope(ctx) },
      select: { id: true, name: true, parentId: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const names: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(categoryId);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    if (names.length === 0) return null;
    return names.join(CATEGORY_LABEL_SEPARATOR);
  }

  async create(req: CreateContractRequest): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    // 작성 부서: 생성자(createdById)의 소속 부서를 계약 부서로 스냅
    const creator = await this.prisma.user.findUnique({
      where: { id: req.createdById },
      select: { departmentId: true },
    });

    // categoryId 소유 검증: 해당 테넌트의 카테고리인지 확인(tenantScope 적용).
    let categoryLabel: string | null = null;
    if (req.categoryId) {
      categoryLabel = await this.resolveCategoryLabel(req.categoryId, ctx);
      if (!categoryLabel) {
        throw new RpcException({ status: 400, message: "유효하지 않은 카테고리" });
      }
    }

    // 체결 완료 등록(registerAs=signed): 검토·결재를 전부 건너뛰는 경로라 여기서 입력 형식을
    // 못 잡으면 나중엔 못 잡는다. 단, 실제로 계약을 signed 로 확정하는 건 이 메서드가 아니라
    // finalizeRegistration() 이다 — create() 는 항상 미배정(unassigned)으로 만들고, signedAt 도
    // 여기서는 저장하지 않는다(형식만 검증). 이유:
    // 1) ownerId 를 생성자로 채워 "담당"으로 만들면 legalReview AI 트리거·알림·"내 담당" 큐가
    //    실제로 검토한 적 없는 사람을 오검색시킨다 — ownerId 는 그런 용도의 필드가 아니다.
    // 2) 서명본이 실제로 업로드되기 전에 status=signed 를 먼저 확정해버리면(예전 방식),
    //    업로드가 실패해도 계약은 이미 "체결 완료" 상태라 영구적으로 서명본 없는 signed 계약이
    //    남는다. unassigned 에 머물게 하면 크래시/실패해도 복구 가능한 상태로 남는다.
    // "최종 서명본 첨부" 게이트는 여기서 제거했다 — finalizeRegistration() 이 실제 바이트가
    // 있는(storageKey not null) role=signed 파일을 요구하는 게 진짜 게이트이고, create() 시점엔
    // presign 이 contractId 를 필요로 해서 아직 실제 파일이 있을 수가 없다(메타데이터-only 로
    // "있는 척"하게 만드는 우회를 더는 쓰지 않는다).
    const isDirectSigned = req.registerAs === "signed";
    if (isDirectSigned) {
      // parseDate 는 빈 문자열/잘못된 형식을 조용히 null 로 반환하므로, 원본 문자열이 아니라
      // 파싱 결과를 검증해야 한다(completeSigning 과 동일한 패턴).
      if (!req.signedAt) {
        throw new RpcException({ status: 400, message: "체결일을 입력하세요" });
      }
      if (!parseDate(req.signedAt)) {
        throw new RpcException({ status: 400, message: "체결일이 올바르지 않습니다" });
      }
      // 체결된 변경 계약은 무엇을 바꾼 계약인지 알아야 한다(갱신·해지는 resolveOriginContractId 가 이미 필수로 막는다).
      if (req.details.stage === "change" && !req.originContractId) {
        throw new RpcException({
          status: 400,
          message: "체결된 변경 계약은 원 계약을 골라야 합니다",
        });
      }
    }

    const originContractId = await this.resolveOriginContractId(req, ctx);

    try {
      const row = await this.prisma.contract.create({
        data: {
          code: generateCode(),
          title: req.title,
          tenantId: resolveTenantId(ctx),
          departmentId: creator?.departmentId ?? null,
          securityLevel: req.securityLevel,
          reviewType: req.reviewType,
          party: req.party ?? null,
          categoryId: req.categoryId ?? null,
          categoryLabel,
          requesterId: req.requesterId ?? null,
          ownerId: req.ownerId ?? null,
          createdById: req.createdById,
          periodStart: parseDate(req.periodStart),
          periodEnd: parseDate(req.periodEnd),
          dueDate: parseDate(req.dueDate),
          originContractId,
          // status 는 지정하지 않는다 — 체결 완료 등록이든 검토 요청이든 항상 스키마 기본값인
          // unassigned 로 시작한다(위 주석 참고). signedAt 은 finalizeRegistration() 이 확정한다.
          schemaVersion: req.schemaVersion,
          // 상신 전 결재선(approvers)은 details JSONB 로만 보관 — 라인은 상신 시 생성.
          details: {
            ...req.details,
            approvers: req.approvers,
          } as unknown as Prisma.InputJsonValue,
          counterparties: {
            create: req.counterparties.map((cp) => ({
              companyId: cp.companyId,
              partyType: cp.partyType ?? null,
              snapshot: cp.snapshot as unknown as Prisma.InputJsonValue,
            })),
          },
          // 첨부 파일 메타데이터(계약서/첨부/참고).
          files: {
            create: req.files.map((f) => ({
              tenantId: resolveTenantId(ctx),
              role: f.role,
              name: f.name,
              meta: f.meta,
              sortOrder: f.sortOrder,
            })),
          },
          // 참조수신자(cc).
          references: {
            create: req.references.map((r) => ({
              ccType: r.ccType,
              isSecret: r.isSecret,
              refId: r.refId,
              name: r.name,
            })),
          },
        },
        include: contractInclude,
      });
      await this.audit.record({
        action: "create",
        targetType: "Contract",
        targetId: row.id,
        actorId: req.createdById,
        tenantId: row.tenantId,
      });
      this.recordStatus(row, null, row.status, req.createdById);
      const response = this.toResponse(row);
      // 검토 경로(계약서 원본, role=contract)만 create 시점에 사전 점검(precheck)을 돌린다.
      // 체결 완료 등록(registerAs=signed)은 이 시점엔 실제 서명본이 없을 수 있으므로(위 주석
      // 참고) risk 분석은 finalizeRegistration() 이 실제 파일 확인 후 트리거한다.
      if (req.files.some((f) => f.role === "contract")) {
        this.triggerWithContractText({
          kind: "precheck",
          contract: response,
          tenantId: row.tenantId,
          triggeredByUserId: req.createdById,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new RpcException({
            status: 400,
            message: "존재하지 않는 사용자 또는 회사가 참조되었습니다",
          });
        }
        // 관리번호(code) 충돌 — 드물게 발생, 한 번 재시도.
        if (error.code === "P2002") {
          return this.create(req);
        }
      }
      throw error;
    }
  }

  async get(req: GetContractRequest): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const row = await this.prisma.contract.findFirst({
      // 삭제된 계약도 읽는다 — 알림·결재함 링크로 들어온 사람에게 "삭제됨"을 알려주기 위해서.
      where: { id: req.id, ...tenantScope(ctx) },
      include: contractInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    // 권한 평가는 중앙 authz 모듈(evaluate) 단일 출처로 구동(이중 판정 금지).
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));

    // 비관련 계약 접근은 존재를 노출하지 않도록 404(general 본인무관·outsideCounsel 미배정 등).
    // admin/법무팀은 canView=true 라 영향 없음.
    if (!authz.canView) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    // 볼 권한이 있던 사람에게만 삭제 사실을 알린다(권한 없는 사람은 위에서 일반 404).
    if (row.deletedAt) {
      throw new RpcException({ status: 404, message: "삭제된 계약입니다" });
    }

    // 결재 라인은 결재 모듈에서 폴리모픽 조회(활성 = 최신 라인).
    const active = await this.approvals.getActive("contract", row.id);
    const response = this.toResponse(row, active.line);

    // 마스킹: evaluate.maskSecret 결과로만 비밀참조 숨김 + 상대회사 PII 마스킹.
    if (authz.maskSecret) {
      response.references = response.references.filter((r) => !r.isSecret);
      response.counterparties = response.counterparties.map((cp) => ({
        ...cp,
        snapshot: maskCompany(cp.snapshot),
      }));
    }

    // 조회자별 수행 가능 액션을 응답에 부착(프론트 버튼 파생).
    response.can = {
      edit: authz.canEdit,
      assign: authz.canAssign,
      transition: authz.canTransition,
      // 시스템 관리자 전권은 evaluate 에 드러나지 않으므로 여기서 더한다(remove() 와 같은 규칙 — 체결 결재 중 불가).
      delete: authz.canDelete || (Boolean(ctx.isSystemAdmin) && row.status !== "signing"),
      replaceSignedFile: authz.canReplaceSignedFile,
    };

    // view 감사: top/secure 보안등급 열람만 기록(normal 은 기록하지 않음).
    if (row.securityLevel !== "normal" && viewer) {
      await this.audit.record({
        action: "view",
        targetType: "Contract",
        targetId: row.id,
        actorId: viewer.id,
        tenantId: row.tenantId,
        detail: { securityLevel: row.securityLevel },
      });
    }

    return response;
  }

  async list(req: ListContractsRequest): Promise<ListContractsResponse> {
    const ctx = req.tenantContext!;
    const page = Math.max(1, req.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, req.pageSize ?? 20));
    const q = req.q?.trim();

    // status(단일)가 있으면 항상 우선한다 — statuses(그룹)는 그때 무시(기존 단일 필터 동작 보존).
    const statusesFilter =
      !req.status && req.statuses ? parseStatusesParam(req.statuses) : undefined;
    const expiryFilter = req.expiry ? parseExpiryFilter(req.expiry) : undefined;

    // expiry 가 있으면 이미 지정된 status/statuses 와 "체결 이후 상태"의 교집합으로 좁힌다.
    // 상태 필터가 아예 없으면(전체 탭 + 만료만) POST_SIGN_STATUSES 전체가 기준이 된다.
    // 교집합이 비면(예: 검토 그룹 + 만료됨) 에러가 아니라 빈 결과(status: { in: [] }).
    const explicitStatuses = req.status ? [req.status] : statusesFilter;
    const statusFilter: ContractStatus | { in: ContractStatus[] } | undefined = req.expiry
      ? {
          in: (explicitStatuses ?? POST_SIGN_STATUSES).filter((s) =>
            POST_SIGN_STATUSES.includes(s),
          ),
        }
      : req.status
        ? req.status
        : statusesFilter
          ? { in: statusesFilter }
          : undefined;

    // 상태를 뺀 조건 — 그룹 탭 건수는 이 조건으로 센다. 만료 필터가 있으면 체결 이후 상태로만 센다.
    const countWhere: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...tenantScope(ctx),
      ...(req.expiry ? { status: { in: POST_SIGN_STATUSES } } : {}),
      ...(req.party ? { party: req.party } : {}),
      ...(req.categoryId ? { categoryId: req.categoryId } : {}),
      ...(req.mineOf ? { createdById: req.mineOf } : {}),
      ...(expiryFilter ? { periodEnd: expiryFilter } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              {
                counterparties: {
                  some: {
                    company: { name: { contains: q, mode: "insensitive" } },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const where: Prisma.ContractWhereInput = {
      ...countWhere,
      ...(statusFilter !== undefined ? { status: statusFilter } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: {
          requester: { select: { name: true } },
          owner: { select: { name: true } },
          counterparties: { take: 1, orderBy: { createdAt: "asc" } },
        },
        // 만료 관리는 만료가 가까운 순(같은 날이면 최근 수정 순), 그 외는 최근 수정 순.
        orderBy:
          req.sort === "periodEnd"
            ? [{ periodEnd: "asc" }, { updatedAt: "desc" }]
            : [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);
    // 그룹 탭 건수 — 목록과 조건이 달라(상태 제외) 따로 센다.
    const grouped = await this.prisma.contract.groupBy({
      by: ["status"],
      where: countWhere,
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      Object.keys(ALLOWED_TRANSITIONS).map((status) => [status, 0]),
    ) as Record<ContractStatus, number>;
    grouped.forEach((group) => {
      counts[group.status] = group._count._all;
    });

    const items: ContractSummary[] = rows.map((r) => {
      const first = r.counterparties[0];
      const snapshot = first
        ? (first.snapshot as unknown as Company)
        : null;
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        securityLevel: r.securityLevel,
        party: r.party,
        categoryLabel: r.categoryLabel,
        counterpartyName: snapshot?.name ?? null,
        requesterId: r.requesterId,
        requesterName: r.requester?.name ?? null,
        ownerId: r.ownerId,
        ownerName: r.owner?.name ?? null,
        dueDate: r.dueDate?.toISOString() ?? null,
        periodEnd: r.periodEnd?.toISOString() ?? null,
        signedAt: r.signedAt ? r.signedAt.toISOString() : null,
        createdById: r.createdById,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, counts };
  }

  async update(req: UpdateContractRequest): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const current = await this.ensureExists(req.id, ctx);

    // 수정 권한(canEdit) 가드 — 중앙 authz 결과만 사용.
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(current));
    if (!authz.canEdit) {
      throw new RpcException({ status: 403, message: "수정 권한이 없습니다" });
    }

    const data: Prisma.ContractUncheckedUpdateInput = {};
    if (req.title !== undefined) data.title = req.title;
    if (req.securityLevel !== undefined) data.securityLevel = req.securityLevel;
    if (req.reviewType !== undefined) data.reviewType = req.reviewType;
    if (req.party !== undefined) data.party = req.party;
    if (req.categoryId !== undefined) {
      data.categoryId = req.categoryId;
      if (req.categoryId) {
        const resolvedLabel = await this.resolveCategoryLabel(req.categoryId, ctx);
        if (!resolvedLabel) {
          throw new RpcException({ status: 400, message: "유효하지 않은 카테고리" });
        }
        data.categoryLabel = resolvedLabel;
      } else {
        // null means unset the category
        data.categoryLabel = null;
      }
    }
    if (req.requesterId !== undefined) data.requesterId = req.requesterId;
    if (req.ownerId !== undefined) data.ownerId = req.ownerId;
    if (req.periodStart !== undefined) data.periodStart = parseDate(req.periodStart);
    if (req.periodEnd !== undefined) data.periodEnd = parseDate(req.periodEnd);
    if (req.dueDate !== undefined) data.dueDate = parseDate(req.dueDate);
    if (req.schemaVersion !== undefined) data.schemaVersion = req.schemaVersion;
    // details/approvers 는 JSONB 하나로 병합 저장(상신 전 결재선 = details.approvers).
    if (req.details !== undefined || req.approvers !== undefined) {
      const baseDetails =
        req.details !== undefined
          ? req.details
          : (current.details as unknown as ContractDetailsV1);
      const baseApprovers =
        req.approvers !== undefined
          ? req.approvers
          : ((current.details as unknown as { approvers?: ApproverSnapshot[] })
              .approvers ?? []);
      data.details = {
        ...baseDetails,
        approvers: baseApprovers,
      } as unknown as Prisma.InputJsonValue;
    }

    // 관계: 제공된 것만 전체 교체(deleteMany + create, 단일 update로 원자적).
    if (req.counterparties !== undefined) {
      data.counterparties = {
        deleteMany: {},
        create: req.counterparties.map((cp) => ({
          companyId: cp.companyId,
          partyType: cp.partyType ?? null,
          snapshot: cp.snapshot as unknown as Prisma.InputJsonValue,
        })),
      };
    }
    // 삭제될 File 의 R2 storageKey 를 update 직전 미리 수집 (deleteMany 가 끝나면 row 가 사라져 못 가져옴).
    // update 성공 후 best-effort 로 R2 객체 삭제 → "편집에서 파일 빼면 R2 도 사라짐" 사용자 의도와 일치.
    let storageKeysToDelete: string[] = [];
    if (req.files !== undefined) {
      // 코멘트 첨부(commentId != null) 보호: deleteMany 가 같은 contractId 의 코멘트 첨부까지
      // 지우지 않게 commentId:null 로 필터.
      // R2 backed 파일(id 있는 입력)은 keep — update 만, R2 객체 보존.
      // id 없는 입력 = 메타데이터-only 신규 생성. 누락된 기존 id(== keep 안 함)는 delete.
      const keepIds = req.files.map((f) => f.id).filter(Boolean) as string[];
      const updates = req.files.filter((f) => f.id);
      const creates = req.files.filter((f) => !f.id);

      // "추가 전용" 모드(editIsAdditiveOnly — 미배정 생성자 완화로만 canEdit 을 얻은 경우,
      // authz 참고): 기존 파일은 하나도 제거할 수 없다. role 무관하게 전부 보호한다 —
      // 이 모드는 애초에 general 처럼 policy.edit=false 인 역할의 생성자까지 포함하도록
      // 만든 완화라, "파일 첨부"보다 넓은 권한(임의 파일 삭제)을 준 적이 없다.
      if (authz.editIsAdditiveOnly) {
        const existingFiles = await this.prisma.file.findMany({
          where: { contractId: req.id, commentId: null },
          select: { id: true },
        });
        const keepIdSet = new Set(keepIds);
        const wouldRemoveExisting = existingFiles.some((f) => !keepIdSet.has(f.id));
        if (wouldRemoveExisting) {
          throw new RpcException({
            status: 400,
            message: "이 상태에서는 파일을 추가할 수만 있고 제거할 수 없습니다",
          });
        }
      }

      // 서명본(role=signed) 보호 — 이미 R2 에 올라간 서명 원본이 이 PATCH 로 조용히 사라지는
      // 사고를 서버에서 원천 차단한다(클라이언트 폼 복원 버그·다른 클라이언트·직접 API 호출 모두).
      // 모든 거부는 아래 deleteMany/R2 삭제 후보 계산·contract.update 보다 먼저 일어난다.
      //
      // 실제 바이트가 있는(storageKey not null) 서명본이 있으면:
      //  (a) 기존 서명본의 role 을 바꿀 수 없다 — { id, role:"attach" } 로 강등하고 id 없는
      //      메타데이터 signed 항목을 끼워 넣으면 "서명본은 있지만 바이트가 없는" 상태가 된다.
      //  (b) 바이트 있는 기존 서명본 중 최소 하나를 id 로 유지해야 한다 — id 없는 메타데이터
      //      signed 항목은 개수에 치지 않는다(그걸 세면 실제 서명본 id 를 빼고 가짜 항목만
      //      남겨 R2 원본을 지울 수 있다). 즉 서명본은 "추가"만 되고 교체·삭제는 안 된다.
      // 바이트 있는 서명본이 없고 메타데이터-only 서명본만 있으면(레거시) 기존 규칙 그대로:
      // signed 항목을 0개로 만드는 PATCH 만 막는다.
      const existingSignedFiles = await this.prisma.file.findMany({
        where: { contractId: req.id, commentId: null, role: "signed" },
        select: { id: true, storageKey: true },
      });
      if (existingSignedFiles.length > 0) {
        const signedRemovalError = new RpcException({
          status: 400,
          message: "서명본 파일은 이 요청으로 제거할 수 없습니다",
        });
        const requestedById = new Map(
          req.files.filter((f) => f.id).map((f) => [f.id as string, f]),
        );
        const hasBackedSignedFile = existingSignedFiles.some((f) => f.storageKey);
        if (hasBackedSignedFile) {
          const isDemoting = existingSignedFiles.some((f) => {
            const requested = requestedById.get(f.id);
            return requested !== undefined && requested.role !== "signed";
          });
          if (isDemoting) {
            throw new RpcException({
              status: 400,
              message: "서명본 파일의 역할은 변경할 수 없습니다",
            });
          }
          const keepsBackedSignedFile = existingSignedFiles.some(
            (f) => f.storageKey && requestedById.get(f.id)?.role === "signed",
          );
          if (!keepsBackedSignedFile) throw signedRemovalError;
        } else if (!req.files.some((f) => f.role === "signed")) {
          throw signedRemovalError;
        }
      }

      // 파일 잠금 — 체결 결재가 시작된 뒤 결재·서명 대상 문서 제거·역할 변경·계약서 추가 금지,
      // 그리고 편집으로 서명본 지정(승격) 금지(contract-file-lock 참고). 서명본 가드 뒤에 둬
      // 서명본 관련 거부는 기존 메시지를 그대로 유지한다. 역시 모든 쓰기 전.
      const lockViolation = getFileLockViolation(current.status, current.files, req.files);
      if (lockViolation) {
        throw new RpcException({ status: 400, message: lockViolation });
      }

      const toDelete = await this.prisma.file.findMany({
        where: {
          contractId: req.id,
          commentId: null,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
          storageKey: { not: null },
        },
        select: { storageKey: true },
      });
      storageKeysToDelete = toDelete
        .map((f) => f.storageKey)
        .filter((k): k is string => Boolean(k));

      data.files = {
        deleteMany: {
          commentId: null,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
        },
        update: updates.map((f) => ({
          where: { id: f.id!, contractId: req.id },
          data: { role: f.role, sortOrder: f.sortOrder, name: f.name, meta: f.meta },
        })),
        create: creates.map((f) => ({
          tenantId: resolveTenantId(ctx),
          role: f.role,
          name: f.name,
          meta: f.meta,
          sortOrder: f.sortOrder,
        })),
      };
    }
    if (req.references !== undefined) {
      data.references = {
        deleteMany: {},
        create: req.references.map((r) => ({
          ccType: r.ccType,
          isSecret: r.isSecret,
          refId: r.refId,
          name: r.name,
        })),
      };
    }

    const row = await this.prisma.contract.update({
      where: { id: req.id, ...tenantScope(ctx) },
      data,
      include: contractInclude,
    });

    // 삭제된 File 의 R2 객체 cleanup (best-effort, 실패해도 사용자 응답엔 영향 없음).
    if (storageKeysToDelete.length > 0) {
      await this.r2.deleteObjects(storageKeysToDelete);
    }

    // 변경된 필드 목록(viewerId/id/tenantContext 제외)을 감사 detail 로 기록.
    const changed = Object.keys(req).filter(
      (k) => k !== "id" && k !== "viewerId" && k !== "tenantContext",
    );
    await this.audit.record({
      action: "update",
      targetType: "Contract",
      targetId: req.id,
      actorId: viewer?.id ?? "system",
      tenantId: row.tenantId,
      detail: { changed },
    });

    const response = this.toResponse(row);

    // spec §6: risk 는 "legalReview 진입 또는 계약서 파일 교체 시" 트리거된다.
    // 검토 중 문서가 바뀌면 기존 위험 분석은 현재 문서와 어긋나므로 다시 돌린다.
    // 담당자(owner) 미배정이면 자격증명 주체가 없어 건너뛴다(상태 전이 트리거와 동일).
    if (
      req.files !== undefined &&
      RISK_RECHECK_STATUSES.includes(current.status as ContractStatus) &&
      row.ownerId &&
      isContractFileReplaced(current.files, req.files)
    ) {
      this.triggerWithContractText({
        kind: "risk",
        contract: response,
        tenantId: row.tenantId,
        triggeredByUserId: row.ownerId,
      });
    }

    // 사전 점검(precheck): 웹은 계약을 먼저 만들고(파일 없이) 계약서 파일을 나중에 붙이므로, create 시점엔
    // 계약서가 없어 사전 점검이 돌 수 없다. 아직 검토 전 단계에서 계약서 원본이 붙거나 바뀌면 그때 돌린다.
    if (
      req.files !== undefined &&
      PRECHECK_STATUSES.includes(current.status as ContractStatus) &&
      isContractFileReplaced(current.files, req.files)
    ) {
      this.triggerWithContractText({
        kind: "precheck",
        contract: response,
        tenantId: row.tenantId,
        triggeredByUserId: row.createdById,
      });
    }

    return response;
  }

  /**
   * 체결 품의 상신 — 요청자 본인 + reviewDone + 결재선 비어있지 않음 + 진행 중 라인 없음.
   * 결재 모듈에 라인 생성 후 계약을 signing 으로 전이한다(알림은 gateway 가 SSE push).
   */
  async submitApproval(
    req: SubmitContractApprovalRequest,
  ): Promise<SubmitContractApprovalResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.id, ctx);
    if (!req.viewerId || row.createdById !== req.viewerId) {
      throw new RpcException({
        status: 403,
        message: "요청자 본인만 상신할 수 있습니다",
      });
    }
    if (row.status !== "reviewDone") {
      throw new RpcException({
        status: 400,
        message: "검토 완료 상태에서만 상신할 수 있습니다",
      });
    }
    const approvers =
      (row.details as unknown as { approvers?: ApproverSnapshot[] })
        .approvers ?? [];
    if (approvers.length === 0) {
      throw new RpcException({ status: 400, message: "결재선이 비어 있습니다" });
    }
    const active = await this.approvals.getActive("contract", row.id);
    if (active.line?.status === "pending") {
      throw new RpcException({
        status: 409,
        message: "진행 중인 결재가 이미 있습니다",
      });
    }

    const { line, notifications } = await this.approvals.submit({
      targetType: "contract",
      targetId: row.id,
      title: row.title,
      submittedById: req.viewerId,
      tenantId: row.tenantId,
      steps: approvers.map((a) => ({
        userId: a.userId ?? null,
        name: a.name,
        dept: a.dept,
        type: a.type,
      })),
    });

    const updated = await this.prisma.contract.update({
      where: { id: row.id },
      data: { status: "signing" },
      include: contractInclude,
    });
    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: { kind: "submitApproval", from: "reviewDone", to: "signing" },
    });
    this.recordStatus(updated, "reviewDone", "signing", req.viewerId ?? null);
    const response = this.toResponse(updated, line);
    // 상신 성공 후 결재자용 브리핑(approvalBriefing)을 백그라운드로 트리거.
    void this.aiAnalysis.trigger({
      targetType: "contract",
      targetId: row.id,
      kind: "approvalBriefing",
      tenantId: row.tenantId,
      triggeredByUserId: req.viewerId!,
      payload: buildApprovalBriefingPayload(response, line),
    });
    return { contract: response, notifications };
  }

  /** 체결 처리 — 결재가 전원 승인된 signing 계약을 signed 로 확정한다.
   *  권한·상태·결재 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다. */
  async completeSigning(
    req: CompleteSigningRequest,
  ): Promise<CompleteSigningResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.contractId, ctx);

    // sealManager 는 status === "signing" 일 때만 canTransition 이 true 다(authz 특수 처리).
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));
    if (!authz.canTransition) {
      throw new RpcException({ status: 403, message: "체결 처리 권한이 없습니다" });
    }
    if (row.status !== "signing") {
      throw new RpcException({ status: 400, message: "체결 진행 상태가 아닙니다" });
    }

    // signedAt 검증 — parseDate 는 빈 문자열/잘못된 형식을 조용히 null 로 반환한다.
    // 여기서 걸러내지 않으면 계약이 signed 로 확정되면서 서명일이 없는 상태가 된다.
    // 게이트웨이의 형식 검증(@IsISO8601)에만 기대지 않고 서비스에서 다시 확인한다.
    const signedAt = parseDate(req.signedAt);
    if (!signedAt) {
      throw new RpcException({ status: 400, message: "체결일이 올바르지 않습니다" });
    }

    // 결재 완료 게이트 — 라인이 없거나 approved 가 아니면 체결할 수 없다.
    const active = await this.approvals.getActive("contract", row.id);
    if (!active.line || active.line.status !== "approved") {
      throw new RpcException({ status: 400, message: "결재가 완료되지 않았습니다" });
    }

    // 서명본 파일은 반드시 이 계약의 "본문" 파일이어야 한다(commentId:null). 그렇지 않으면
    // 코멘트 첨부(File.commentId != null)도 통과해 signed 로 승격될 수 있다 — 코멘트
    // 첨부는 contractInclude.files 에서 걸러지므로(commentId:null 필터) 그렇게 승격된
    // 파일은 계약의 files 목록에 다시는 나타나지 않는, 눈에 보이지 않는 서명본이 된다.
    // fileId 는 필수다(게이트웨이 DTO 도 동일) — 그래도 방어적으로 다시 확인한다.
    // finalizeRegistration 과 같은 형태의 게이트: 실제 바이트가 있어야(storageKey not null)
    // 하고(메타데이터-only "있는 척"을 signed 로 확정할 수 없게), 검토본(role:"contract")을
    // 그대로 승격할 수 없다 — 그러면 계약의 유일한 계약서 파일이 사라져, 결재 라인이 있는
    // 계약을 다시 열었을 때(검토 모드로 열림) 편집 화면이 영구히 저장 불가능해진다.
    if (!req.fileId) {
      throw new RpcException({ status: 400, message: "최종 서명본을 첨부하세요" });
    }
    const file = await this.prisma.file.findFirst({
      where: { id: req.fileId, contractId: row.id, commentId: null },
      select: { id: true, role: true, storageKey: true },
    });
    if (!file) {
      throw new RpcException({ status: 400, message: "잘못된 파일입니다" });
    }
    if (!file.storageKey) {
      throw new RpcException({ status: 400, message: "최종 서명본을 첨부하세요" });
    }
    if (file.role === "contract") {
      throw new RpcException({
        status: 400,
        message: "검토본은 서명본으로 지정할 수 없습니다. 서명본을 새로 첨부하세요",
      });
    }

    // 파일 승격 + 상태 확정을 한 트랜잭션으로 묶는다 — 도중에 실패하면 파일만 signed 로
    // 남고 계약은 signing 에 머무는 절반 반영을 막는다(signing→reviewDone 은 허용된 역방향
    // 전이라 그 상태로 검토에 돌아가면 유령 서명본이 남는다).
    // where 에 status:"signing" 을 넣어 동시 요청 중 하나만 성공하도록(CAS) 방어한다.
    // 파일 쪽도 같은 이유로 위에서 확인한 조건(role != contract, storageKey not null)을
    // where 에 다시 넣는다 — 그렇지 않으면 findFirst 로 확인한 시점과 이 update 사이에
    // 동시 PATCH 가 파일의 role 을 contract 로 바꿔치기하는 TOCTOU 틈이 생긴다. 대상이
    // 사라지면(findFirst 이후 상태 변경) $transaction 이 P2025 를 던지고, 기존 catch 가
    // 이미 409 로 변환한다.
    const fileUpdate = this.prisma.file.update({
      where: {
        id: req.fileId,
        contractId: row.id,
        commentId: null,
        role: { not: "contract" },
        storageKey: { not: null },
      },
      data: { role: "signed" },
    });
    const contractUpdate = this.prisma.contract.update({
      where: { id: row.id, status: "signing", ...tenantScope(ctx) },
      data: { status: "signed", signedAt },
      include: contractInclude,
    });

    let updated: ContractWithRelations;
    try {
      const [, updatedRow] = await this.prisma.$transaction([
        fileUpdate,
        contractUpdate,
      ]);
      updated = updatedRow;
    } catch (error) {
      // 동시 요청 등으로 그 사이 signing 상태가 아니게 된 경우(CAS 실패) — P2025: 대상 행 없음.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 처리되었거나 상태가 변경된 계약입니다",
        });
      }
      throw error;
    }

    // audit 는 트랜잭션 커밋 후 best-effort 로 기록한다(AuditService.record 는 실패를
    // 삼키도록 설계돼 있으므로, 감사 기록 실패가 이미 커밋된 체결 처리를 되돌리지 않는다).
    this.recordStatus(updated, "signing", "signed", req.viewerId);
    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: {
        kind: "completeSigning",
        from: "signing",
        to: "signed",
        note: req.note ?? null,
      },
    });
    // 갱신·해지 계약이면 원 계약을 즉시 종료한다(체결 완료 등록과 같은 규칙).
    await this.closeOriginOnSigning(updated, signedAt, req.viewerId);
    const response = this.toResponse(updated, active.line);
    // 만료 관리용 자동갱신·해지 통지 조항 추출 — 요청자(생성자)의 AI 연동으로 백그라운드 실행.
    this.triggerWithContractText({
      kind: "renewalTerms",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: row.createdById,
    });
    return { contract: response };
  }

  /** 계약 삭제(소프트 삭제) — deletedAt 을 채워 목록·상세·검색·코멘트·파일 다운로드·AI 비서에서 제외한다.
   *  파일(R2)·변경 기록은 보존한다(잘못 지웠을 때 관리자가 되살릴 수 있게).
   *  권한: 담당자 배정 전 생성자 본인(authz.canDelete — 잘못 만든 요청 정리) 또는 시스템 관리자.
   *  체결 결재 진행 중(signing)에는 막는다 — 결재자 대기함에 삭제된 계약의 결재가 남기 때문이다. */
  async remove(req: DeleteContractRequest): Promise<DeleteContractResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.id, ctx);

    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));
    if (!viewer || !(authz.canDelete || ctx.isSystemAdmin)) {
      throw new RpcException({ status: 403, message: "계약 삭제 권한이 없습니다" });
    }
    if (row.status === "signing") {
      throw new RpcException({
        status: 400,
        message: "체결 결재가 진행 중인 계약은 삭제할 수 없습니다. 결재를 끝내거나 반려한 뒤 삭제하세요",
      });
    }

    // where 에 deletedAt:null·status≠signing 을 다시 넣어(CAS) 동시 삭제·그 사이 상신에 대비한다.
    try {
      await this.prisma.contract.update({
        where: { id: row.id, deletedAt: null, status: { not: "signing" }, ...tenantScope(ctx) },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 삭제되었거나 상태가 변경된 계약입니다",
        });
      }
      throw error;
    }

    await this.audit.record({
      action: "delete",
      targetType: "Contract",
      targetId: row.id,
      actorId: viewer.id,
      tenantId: row.tenantId,
      detail: { code: row.code, title: row.title, status: row.status },
    });
    return { ok: true };
  }

  /** 서명본 교체 — 체결된 계약의 서명본을 잘못 올렸을 때 법무팀이 새 파일로 바꾼다.
   *  편집(PATCH)은 서명본 교체·삭제를 막으므로(§5.4) 이 전용 경로로만 바꿀 수 있다.
   *  기존 서명본은 지우지 않고 첨부로 내려 이력으로 남기며(법적 원본 추적), 사유는 감사 로그에 남긴다.
   *  권한·상태·파일 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다. */
  async replaceSignedFile(
    req: ReplaceSignedFileRequest,
  ): Promise<ReplaceSignedFileResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.contractId, ctx);

    if (!POST_SIGN_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결된 계약만 서명본을 교체할 수 있습니다" });
    }
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));
    if (!authz.canReplaceSignedFile) {
      throw new RpcException({ status: 403, message: "서명본 교체 권한이 없습니다" });
    }
    const reason = (req.reason ?? "").trim();
    if (!reason) {
      throw new RpcException({ status: 400, message: "교체 사유를 입력하세요" });
    }

    // 새 서명본은 이 계약 본문에 새로 첨부한 파일(role=attach)이어야 한다 — 계약서·참고서류를 서명본으로
    // 바꾸면 그 문서가 목록에서 사라지고, 코멘트 첨부는 계약 파일 목록에 보이지 않는 서명본이 된다.
    const file = await this.prisma.file.findFirst({
      where: { id: req.fileId, contractId: row.id, commentId: null },
      select: { id: true, role: true, storageKey: true },
    });
    if (!file) {
      throw new RpcException({ status: 400, message: "잘못된 파일입니다" });
    }
    if (!file.storageKey) {
      throw new RpcException({ status: 400, message: "새 서명본을 첨부하세요" });
    }
    if (file.role !== "attach") {
      throw new RpcException({ status: 400, message: "새로 첨부한 파일만 서명본으로 지정할 수 있습니다" });
    }

    const previousSigned = await this.prisma.file.findMany({
      where: { contractId: row.id, commentId: null, role: "signed" },
      select: { id: true },
    });
    const replacedOn = new Date().toISOString().slice(0, 10);

    // 기존 서명본 강등 + 새 파일 승격 + 계약 갱신을 한 트랜잭션으로 — 중간에 실패해 서명본이 0개나 2개가
    // 되는 절반 반영을 막는다. 새 파일·계약 쪽 where 에 확인한 조건을 다시 넣어(CAS) 동시 요청·상태 변경에
    // 대비하고, 대상이 사라지면 P2025 → 409.
    let updated: ContractWithRelations;
    try {
      const [, , updatedRow] = await this.prisma.$transaction([
        this.prisma.file.updateMany({
          where: { contractId: row.id, commentId: null, role: "signed" },
          data: { role: "attach", meta: `이전 서명본 · ${replacedOn} 교체` },
        }),
        this.prisma.file.update({
          where: {
            id: file.id,
            contractId: row.id,
            commentId: null,
            role: "attach",
            storageKey: { not: null },
          },
          data: { role: "signed" },
        }),
        this.prisma.contract.update({
          where: { id: row.id, status: { in: POST_SIGN_STATUSES }, ...tenantScope(ctx) },
          data: { updatedAt: new Date() },
          include: contractInclude,
        }),
      ]);
      updated = updatedRow;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 처리되었거나 상태가 변경된 계약입니다",
        });
      }
      throw error;
    }

    await this.audit.record({
      action: "update",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: {
        kind: "replaceSignedFile",
        previousFileIds: previousSigned.map((f) => f.id),
        fileId: file.id,
        reason,
      },
    });
    const active = await this.approvals.getActive("contract", row.id);
    return { contract: this.toResponse(updated, active.line) };
  }

  /** 체결 완료 등록(registerAs=signed) 확정 — create() 는 항상 unassigned 로 만들고 signedAt 을
   *  저장하지 않으므로, 생성자가 서명본 업로드를 마친 뒤 이 메서드를 호출해야 실제로 signed 가
   *  된다. completeSigning 과 의도적으로 분리했다: completeSigning 은 결재 전원 승인을
   *  요구하는데 이 경로엔 애초에 결재 라인이 없다(검토·결재를 건너뛰는 게 이 기능의 목적).
   *
   *  권한은 반드시 이 조건을 직접 검사한다 — evaluate().canEdit 을 재사용하지 않는다.
   *  canEdit 은 `ownerOk || canEditUnassigned` 라서, 정상적인 법무 검토 요청(담당자가 배정된
   *  일반 계약)의 담당자(owner)도 canEdit=true 를 받는다. 만약 여기서 canEdit 을 그대로 썼다면,
   *  담당자가 role=signed 파일 하나 첨부하고 이 엔드포인트를 호출하는 것만으로 ALLOWED_TRANSITIONS·
   *  updateStatus 가드·결재 게이트를 전부 건너뛰고 계약을 signed 로 만들 수 있었다 — 이 기능
   *  전체가 막으려던 그 우회를 finalize 자신이 다시 열어버리는 셈이다. 그래서 여기서는
   *  "미배정 + 생성자 본인" 두 조건을 authz 모듈을 거치지 않고 직접 확인한다. */
  /** 만료 관리 "AI로 읽기" — 체결 완료·계약 이행 계약의 자동갱신·해지 통지 조항을 누른 사람의 AI 연동으로 추출한다. */
  async analyzeRenewalTerms(req: AnalyzeRenewalTermsRequest): Promise<{ ok: true }> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.contractId, ctx);
    const viewer = await this.loadViewer(req.viewerId, ctx);
    // 볼 수 없는 계약은 있는지도 알리지 않는다(get 과 같은 규칙).
    if (!evaluate(viewer, this.toAuthzContract(row)).canView) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    if (!TERMINABLE_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결 완료·계약 이행 중인 계약만 읽을 수 있습니다" });
    }
    this.triggerWithContractText({
      kind: "renewalTerms",
      contract: this.toResponse(row),
      tenantId: row.tenantId,
      triggeredByUserId: req.viewerId,
    });
    return { ok: true };
  }

  /** 중도 해지 — 체결 완료·계약 이행 계약을 해지일·사유·해지 합의서(통지서)와 함께 종료(terminated)한다. */
  async terminate(req: TerminateContractRequest): Promise<TerminateContractResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.contractId, ctx);

    if (!TERMINABLE_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결 완료·계약 이행 중인 계약만 해지할 수 있습니다" });
    }
    // 권한은 이행 시작·계약 종료와 같다(법무팀·담당자·요청자 — authz 체결 이후 규칙).
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));
    if (!authz.canTransition) {
      throw new RpcException({ status: 403, message: "해지 권한이 없습니다" });
    }
    const terminatedOn = parseDate(req.terminatedOn);
    if (!terminatedOn) {
      throw new RpcException({ status: 400, message: "해지일이 올바르지 않습니다" });
    }
    const reasonLabel = TERMINATION_REASON_LABEL[req.reason];
    if (!reasonLabel) {
      throw new RpcException({ status: 400, message: "해지 사유를 고르세요" });
    }

    // 해지 서류는 이 계약 본문에 새로 첨부한 파일(role=attach)이어야 한다 — 서명본 교체와 같은 이유.
    const file = await this.prisma.file.findFirst({
      where: { id: req.fileId, contractId: row.id, commentId: null },
      select: { id: true, role: true, storageKey: true },
    });
    if (!file || !file.storageKey) {
      throw new RpcException({ status: 400, message: "해지 합의서·통지서를 첨부하세요" });
    }
    if (file.role !== "attach") {
      throw new RpcException({ status: 400, message: "새로 첨부한 파일만 해지 서류로 지정할 수 있습니다" });
    }

    const note = (req.note ?? "").trim();
    const closedNote = note ? `${reasonLabel} — ${note}` : reasonLabel;
    const terminatedOnLabel = terminatedOn.toISOString().slice(0, 10);

    // 해지 서류 표시 + 계약 종료를 한 트랜잭션으로. 확인한 조건을 where 에 다시 넣어(CAS) 동시 요청에 대비하고,
    // 대상이 사라지면 P2025 → 409.
    let updated: ContractWithRelations;
    try {
      const [, updatedRow] = await this.prisma.$transaction([
        this.prisma.file.update({
          where: { id: file.id, contractId: row.id, commentId: null, role: "attach", storageKey: { not: null } },
          data: { meta: `해지 합의서·통지서 · ${terminatedOnLabel}` },
        }),
        this.prisma.contract.update({
          where: { id: row.id, status: { in: TERMINABLE_STATUSES }, ...tenantScope(ctx) },
          data: { status: "closed", closedReason: "terminated", closedAt: terminatedOn, closedNote },
          include: contractInclude,
        }),
      ]);
      updated = updatedRow;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new RpcException({ status: 409, message: "이미 처리되었거나 상태가 변경된 계약입니다" });
      }
      throw error;
    }

    this.recordStatus(updated, row.status, "closed", req.viewerId);
    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: {
        kind: "terminate",
        from: row.status,
        to: "closed",
        reason: req.reason,
        terminatedOn: terminatedOnLabel,
        fileId: file.id,
        ...(note ? { note } : {}),
      },
    });

    return { contract: this.toResponse(updated) };
  }

  async finalizeRegistration(
    req: FinalizeRegistrationRequest,
  ): Promise<FinalizeRegistrationResult> {
    const ctx = req.tenantContext!;
    const row = await this.ensureExists(req.contractId, ctx);

    if (row.ownerId !== null || req.viewerId !== row.createdById) {
      throw new RpcException({ status: 403, message: "등록 확정 권한이 없습니다" });
    }
    if (row.status !== "unassigned") {
      throw new RpcException({ status: 400, message: "미배정 상태가 아닙니다" });
    }

    // parseDate 는 빈 문자열/잘못된 형식을 조용히 null 로 반환하므로, 원본 문자열이 아니라
    // 파싱 결과를 검증해야 한다(completeSigning 과 동일한 패턴).
    const signedAt = parseDate(req.signedAt);
    if (!signedAt) {
      throw new RpcException({ status: 400, message: "체결일이 올바르지 않습니다" });
    }

    // 진짜 게이트: 파일명만 있는 메타데이터-only 행이 아니라, 실제로 R2 에 올라간(storageKey
    // not null) role=signed 파일이 있어야만 통과한다 — "서명본이 실은 빈 파일"인 상태를
    // signed 로 확정할 수 없게 만드는 지점이 여기다.
    const signedFile = await this.prisma.file.findFirst({
      where: {
        contractId: row.id,
        commentId: null,
        role: "signed",
        storageKey: { not: null },
      },
      select: { id: true },
    });
    if (!signedFile) {
      throw new RpcException({ status: 400, message: "최종 서명본을 첨부하세요" });
    }

    // where 에 status:"unassigned" 를 넣어 동시 요청 중 하나만 성공하도록(CAS) 방어한다
    // (completeSigning 과 동일 패턴).
    let updated: ContractWithRelations;
    try {
      updated = await this.prisma.contract.update({
        where: { id: row.id, status: "unassigned", ...tenantScope(ctx) },
        data: { status: "signed", signedAt },
        include: contractInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 처리되었거나 상태가 변경된 계약입니다",
        });
      }
      throw error;
    }

    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: { kind: "finalizeRegistration", from: "unassigned", to: "signed" },
    });
    this.recordStatus(updated, "unassigned", "signed", req.viewerId);

    await this.closeOriginOnSigning(updated, signedAt, req.viewerId);

    const response = this.toResponse(updated);
    // create() 시점엔 미룬 risk 분석을 여기서 트리거한다 — 이제야 실제 서명본 내용이 있다.
    this.triggerWithContractText({
      kind: "risk",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: req.viewerId,
    });
    // 만료 관리용 자동갱신·해지 통지 조항 추출(체결 처리와 같은 규칙).
    this.triggerWithContractText({
      kind: "renewalTerms",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: row.createdById,
    });

    return { contract: response };
  }

  async updateStatus(
    req: UpdateContractStatusRequest,
  ): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const current = await this.ensureExists(req.id, ctx);
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(current));

    // signed 로의 전이는 completeSigning 전용 — 이 경로엔 결재 완료 게이트가 없으므로
    // (sealManager 는 status==="signing" 이기만 하면 canTransition=true) 역할과 무관하게
    // 여기서 차단해 결재 완료 검증 우회를 막는다.
    if (req.status === "signed") {
      throw new RpcException({
        status: 400,
        message: "체결 처리는 체결 처리 기능을 사용하세요",
      });
    }

    const isTransition = current.status !== req.status;
    const isAssign = req.ownerId !== undefined;
    // 배정(미배정 → 배정 중 + 담당자 지정)은 담당자를 "정하는" 행위다. 전이 권한(canTransition)은
    // 담당자 본인에게만 주므로(requiresOwner) 아직 담당자가 없는 미배정 건에 적용하면 누구도 배정할 수
    // 없어 프로세스가 첫 단계에서 멈춘다 — 이 전이는 배정 권한(canAssign: 미배정 건은 assign 역할 픽업)으로 판정한다.
    const isAssignTransition = isAssign && current.status === "unassigned" && req.status === "assigning";

    // 역할 전이 권한 가드. 통과 후 from→to 전이맵(ALLOWED_TRANSITIONS) 이중 결합.
    if (isTransition) {
      if (isAssignTransition ? !authz.canAssign : !authz.canTransition) {
        throw new RpcException({
          status: 403,
          message: isAssignTransition ? "배정 권한이 없습니다" : "상태 전이 권한이 없습니다",
        });
      }
      const allowed = ALLOWED_TRANSITIONS[current.status];
      if (!allowed.includes(req.status)) {
        throw new RpcException({
          status: 400,
          message: `'${current.status}' → '${req.status}' 상태 전이는 허용되지 않습니다`,
        });
      }
    }

    // 담당자(owner) 배정 권한 가드.
    if (isAssign && !authz.canAssign) {
      throw new RpcException({ status: 403, message: "배정 권한이 없습니다" });
    }

    const row = await this.prisma.contract.update({
      where: { id: req.id, ...tenantScope(ctx) },
      data: {
        status: req.status,
        ...(req.ownerId !== undefined ? { ownerId: req.ownerId } : {}),
        // 종료로 넘길 때 사유·종료일을 함께 남긴다(갱신·해지는 전용 흐름에서 정한다).
        ...(isTransition && req.status === "closed"
          ? { closedReason: req.closedReason ?? "completed", closedAt: new Date() }
          : {}),
      },
      include: contractInclude,
    });

    const response = this.toResponse(row);

    if (isTransition) {
      await this.audit.record({
        action: "transition",
        targetType: "Contract",
        targetId: req.id,
        actorId: viewer?.id ?? "system",
        tenantId: row.tenantId,
        detail: { from: current.status, to: req.status },
      });
      this.recordStatus(row, current.status, req.status, viewer?.id ?? null);
      // legalReview 진입: 담당자(owner) 배정 전이면 트리거 자체를 건너뛴다(AiAnalysisService 의
      // 자격증명 없음 처리와 동일하게, 호출부에서 미리 걸러 불필요한 skipped 행 생성을 피함).
      if (req.status === "legalReview" && row.ownerId) {
        this.triggerWithContractText({
          kind: "risk",
          contract: response,
          tenantId: row.tenantId,
          triggeredByUserId: row.ownerId,
        });
      }
      // reviewDone 진입: 상신 전 결재자용 요약(submitBriefing)을 백그라운드로 트리거.
      if (req.status === "reviewDone") {
        void this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: req.id,
          kind: "submitBriefing",
          tenantId: row.tenantId,
          triggeredByUserId: row.createdById,
          payload: buildSubmitBriefingPayload(response),
        });
      }
    }

    return response;
  }

  // 삭제되지 않은 계약 존재 확인 후 현재 행(관계 포함) 반환(없으면 404).
  // 권한 평가(evaluate)에 references/createdById/ownerId 가 필요하므로 contractInclude 로 로드.
  // tenantScope 를 where 에 합쳐 타 테넌트 id 위조를 차단한다.
  private async ensureExists(
    id: string,
    ctx: TenantContext,
  ): Promise<ContractWithRelations> {
    const row = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null, ...tenantScope(ctx) },
      include: contractInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    return row;
  }

  private toResponse(
    row: ContractWithRelations,
    line: ApprovalLineDto | null = null,
  ): ContractResponse {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      securityLevel: row.securityLevel,
      reviewType: row.reviewType,
      party: row.party,
      categoryId: row.categoryId,
      categoryLabel: row.categoryLabel,
      requesterId: row.requesterId,
      requesterName: row.requester?.name ?? null,
      ownerId: row.ownerId,
      ownerName: row.owner?.name ?? null,
      createdById: row.createdById,
      periodStart: row.periodStart?.toISOString() ?? null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
      dueDate: row.dueDate?.toISOString() ?? null,
      signedAt: row.signedAt ? row.signedAt.toISOString() : null,
      closedReason: row.closedReason ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      closedNote: row.closedNote ?? null,
      originContractId: row.originContractId ?? null,
      originContract:
        row.originContract && !row.originContract.deletedAt ? toContractLinkRef(row.originContract) : null,
      derivedContracts: (row.derivedContracts ?? []).map(toContractLinkRef),
      schemaVersion: row.schemaVersion,
      details: row.details as unknown as ContractDetailsV1,
      counterparties: row.counterparties.map((cp) => ({
        id: cp.id,
        companyId: cp.companyId,
        partyType: cp.partyType,
        snapshot: cp.snapshot as unknown as Company,
      })),
      approvalLine: line
        ? {
            id: line.id,
            status: line.status,
            steps: line.steps.map((s) => ({
              id: s.id,
              stepOrder: s.stepOrder,
              userId: s.userId,
              name: s.name,
              avatarUrl: s.avatarUrl,
              dept: s.dept,
              type: s.type,
              status: s.status,
              comment: s.comment,
              decidedAt: s.decidedAt,
            })),
            currentStepId: line.currentStepId,
            submittedById: line.submittedById,
            submittedAt: line.submittedAt,
          }
        : null,
      plannedApprovers:
        (row.details as unknown as { approvers?: ApproverSnapshot[] })
          .approvers ?? [],
      files: row.files.map((f) => ({
        id: f.id,
        role: f.role,
        name: f.name,
        meta: f.meta,
        size: f.size,
        mimeType: f.mimeType,
        storageKey: f.storageKey,
        sortOrder: f.sortOrder,
      })),
      references: row.references.map((r) => ({
        id: r.id,
        ccType: r.ccType,
        isSecret: r.isSecret,
        refId: r.refId,
        name: r.name,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
