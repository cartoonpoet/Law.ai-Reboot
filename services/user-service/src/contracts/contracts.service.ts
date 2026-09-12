import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./contracts.audit";
import { R2Client } from "../files/r2.client";
import { ApprovalsService } from "../approvals/approvals.service";
import { AiAnalysisService } from "../ai-analysis/ai-analysis.service";
import {
  buildPrecheckPayload,
  buildRiskPayload,
  buildSubmitBriefingPayload,
  buildApprovalBriefingPayload,
} from "../ai-analysis/prompt-payloads";
import { evaluate } from "./contracts.authz";
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
} satisfies Prisma.ContractInclude;

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

// 상태 전이 허용 맵(from → 허용 to[]).
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["unassigned"],
  unassigned: ["assigning", "legalReview"],
  assigning: ["legalReview"],
  legalReview: ["requesterReview", "reviewDone"],
  requesterReview: ["legalReview", "reviewDone"],
  reviewDone: ["signing", "legalReview"],
  signing: ["signed", "reviewDone"],
  signed: ["fulfilling"],
  fulfilling: ["closed"],
  closed: [],
};

// 계약서 파일 교체 시 risk 재분석을 다시 돌릴 상태(spec §6). 법무 검토 루프 안에 있는
// 두 상태 — 이 구간에서는 첨부된 문서가 곧 검토 대상이라 문서가 바뀌면 기존 분석이 무효다.
// (requesterReview 는 legalReview 로 되돌아갈 수 있는 같은 루프의 반대편이다.)
const RISK_RECHECK_STATUSES: ContractStatus[] = ["legalReview", "requesterReview"];

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

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly r2: R2Client,
    private readonly approvals: ApprovalsService,
    private readonly aiAnalysis: AiAnalysisService,
  ) {}

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

    // 체결 완료 등록: 검토·결재를 건너뛰므로 여기서 못 잡으면 영영 못 잡는다.
    const isDirectSigned = req.registerAs === "signed";
    if (isDirectSigned) {
      if (!req.signedAt) {
        throw new RpcException({ status: 400, message: "체결일을 입력하세요" });
      }
      if (!req.files.some((f) => f.role === "signed")) {
        throw new RpcException({ status: 400, message: "최종 서명본을 첨부하세요" });
      }
      const details = req.details as unknown as {
        stage?: string;
        relatedDocs?: unknown[];
      };
      if (details.stage === "change" && !details.relatedDocs?.length) {
        throw new RpcException({
          status: 400,
          message: "변경·해지 계약은 원 계약을 연결해야 합니다",
        });
      }
    }

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
          ...(isDirectSigned
            ? { status: "signed" as const, signedAt: parseDate(req.signedAt) }
            : {}),
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
      const response = this.toResponse(row);
      // 검토 경로는 계약서 원본(role=contract) 기준 사전 점검(precheck),
      // 체결 완료 등록은 서명본(role=signed) 기준 위험 분석(risk) 을 백그라운드로 돌린다.
      if (isDirectSigned) {
        if (req.files.some((f) => f.role === "signed")) {
          void this.aiAnalysis.trigger({
            targetType: "contract",
            targetId: row.id,
            kind: "risk",
            tenantId: row.tenantId,
            triggeredByUserId: req.createdById,
            payload: buildRiskPayload(response, null),
          });
        }
      } else if (req.files.some((f) => f.role === "contract")) {
        void this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: row.id,
          kind: "precheck",
          tenantId: row.tenantId,
          triggeredByUserId: req.createdById,
          payload: buildPrecheckPayload(response),
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
      where: { id: req.id, deletedAt: null, ...tenantScope(ctx) },
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
      delete: authz.canDelete,
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

    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...tenantScope(ctx),
      ...(req.status ? { status: req.status } : {}),
      ...(req.party ? { party: req.party } : {}),
      ...(req.categoryId ? { categoryId: req.categoryId } : {}),
      ...(req.mineOf ? { createdById: req.mineOf } : {}),
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

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: {
          requester: { select: { name: true } },
          owner: { select: { name: true } },
          counterparties: { take: 1, orderBy: { createdAt: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);

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
        createdById: r.createdById,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return { items, total, page, pageSize };
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
      void this.aiAnalysis.trigger({
        targetType: "contract",
        targetId: req.id,
        kind: "risk",
        tenantId: row.tenantId,
        triggeredByUserId: row.ownerId,
        payload: buildRiskPayload(response, null),
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

    // 서명본 파일은 반드시 이 계약의 "본문" 파일이어야 한다. commentId:null 이 없으면
    // 코멘트 첨부(File.commentId != null)도 통과해 signed 로 승격될 수 있다 — 코멘트
    // 첨부는 contractInclude.files 에서 걸러지므로(commentId:null 필터) 그렇게 승격된
    // 파일은 계약의 files 목록에 다시는 나타나지 않는, 눈에 보이지 않는 서명본이 된다.
    if (req.fileId) {
      const file = await this.prisma.file.findFirst({
        where: { id: req.fileId, contractId: row.id, commentId: null },
        select: { id: true },
      });
      if (!file) {
        throw new RpcException({ status: 400, message: "잘못된 파일입니다" });
      }
    }

    // 파일 승격 + 상태 확정을 한 트랜잭션으로 묶는다 — 도중에 실패하면 파일만 signed 로
    // 남고 계약은 signing 에 머무는 절반 반영을 막는다(signing→reviewDone 은 허용된 역방향
    // 전이라 그 상태로 검토에 돌아가면 유령 서명본이 남는다).
    // where 에 status:"signing" 을 넣어 동시 요청 중 하나만 성공하도록(CAS) 방어한다.
    const fileUpdate = req.fileId
      ? this.prisma.file.update({
          where: { id: req.fileId, contractId: row.id, commentId: null },
          data: { role: "signed" },
        })
      : null;
    const contractUpdate = this.prisma.contract.update({
      where: { id: row.id, status: "signing", ...tenantScope(ctx) },
      data: { status: "signed", signedAt },
      include: contractInclude,
    });

    let updated: ContractWithRelations;
    try {
      if (fileUpdate) {
        const [, updatedRow] = await this.prisma.$transaction([
          fileUpdate,
          contractUpdate,
        ]);
        updated = updatedRow;
      } else {
        const [updatedRow] = await this.prisma.$transaction([contractUpdate]);
        updated = updatedRow;
      }
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
    return { contract: this.toResponse(updated, active.line) };
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

    // 역할 전이 권한 가드. 통과 후 from→to 전이맵(ALLOWED_TRANSITIONS) 이중 결합.
    if (isTransition) {
      if (!authz.canTransition) {
        throw new RpcException({
          status: 403,
          message: "상태 전이 권한이 없습니다",
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
      // legalReview 진입: 담당자(owner) 배정 전이면 트리거 자체를 건너뛴다(AiAnalysisService 의
      // 자격증명 없음 처리와 동일하게, 호출부에서 미리 걸러 불필요한 skipped 행 생성을 피함).
      if (req.status === "legalReview" && row.ownerId) {
        void this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: req.id,
          kind: "risk",
          tenantId: row.tenantId,
          triggeredByUserId: row.ownerId,
          payload: buildRiskPayload(response, null),
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
