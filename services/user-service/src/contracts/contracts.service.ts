import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./contracts.audit";
import { R2Client } from "../files/r2.client";
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
} from "@lawai/contracts";

// Prisma 가 counterparties + 결재선(단계 포함)을 include 한 Contract 행
const contractInclude = {
  requester: { select: { name: true } },
  owner: { select: { name: true } },
  counterparties: true,
  approvalLines: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
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
  signing: ["signed"],
  signed: ["fulfilling"],
  fulfilling: ["closed"],
  closed: [],
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
  ) {}

  // viewer(role/departmentId) 조회. viewerId 없거나 사용자 미존재면 null(evaluate 안전 기본).
  // TODO(Task 10): user.role 이 User 모델에서 제거됐으므로 UserTenant.role 로 교체 필요.
  //               현재는 타입 캐스트로 빌드만 통과시키고 Task 10 에서 완성한다.
  private async loadViewer(viewerId?: string): Promise<AuthzViewer | null> {
    if (!viewerId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
      include: { department: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: (user as any).role ?? "general",
      departmentId: user.departmentId,
    };
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
  private async resolveCategoryLabel(
    categoryId: string | null,
  ): Promise<string | null> {
    if (!categoryId) return null;
    const rows = await this.prisma.contractCategory.findMany({
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
          categoryLabel: await this.resolveCategoryLabel(req.categoryId ?? null),
          requesterId: req.requesterId ?? null,
          ownerId: req.ownerId ?? null,
          createdById: req.createdById,
          periodStart: parseDate(req.periodStart),
          periodEnd: parseDate(req.periodEnd),
          dueDate: parseDate(req.dueDate),
          schemaVersion: req.schemaVersion,
          details: req.details as unknown as Prisma.InputJsonValue,
          counterparties: {
            create: req.counterparties.map((cp) => ({
              companyId: cp.companyId,
              partyType: cp.partyType ?? null,
              snapshot: cp.snapshot as unknown as Prisma.InputJsonValue,
            })),
          },
          // 결재선: approvers 가 있을 때만 1개 생성하고 배열 순서대로 단계화.
          approvalLines:
            req.approvers.length > 0
              ? {
                  create: {
                    steps: {
                      create: req.approvers.map((a, index) => ({
                        stepOrder: index,
                        name: a.name,
                        dept: a.dept,
                        type: a.type,
                      })),
                    },
                  },
                }
              : undefined,
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
      });
      return this.toResponse(row);
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
    const viewer = await this.loadViewer(req.viewerId);
    const authz = evaluate(viewer, this.toAuthzContract(row));

    // 비관련 계약 접근은 존재를 노출하지 않도록 404(general 본인무관·outsideCounsel 미배정 등).
    // admin/법무팀은 canView=true 라 영향 없음.
    if (!authz.canView) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }

    const response = this.toResponse(row);

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
    const viewer = await this.loadViewer(req.viewerId);
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
      data.categoryLabel = await this.resolveCategoryLabel(req.categoryId);
    }
    if (req.requesterId !== undefined) data.requesterId = req.requesterId;
    if (req.ownerId !== undefined) data.ownerId = req.ownerId;
    if (req.periodStart !== undefined) data.periodStart = parseDate(req.periodStart);
    if (req.periodEnd !== undefined) data.periodEnd = parseDate(req.periodEnd);
    if (req.dueDate !== undefined) data.dueDate = parseDate(req.dueDate);
    if (req.schemaVersion !== undefined) data.schemaVersion = req.schemaVersion;
    if (req.details !== undefined)
      data.details = req.details as unknown as Prisma.InputJsonValue;

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
    if (req.approvers !== undefined) {
      data.approvalLines =
        req.approvers.length > 0
          ? {
              deleteMany: {},
              create: {
                steps: {
                  create: req.approvers.map((a, index) => ({
                    stepOrder: index,
                    name: a.name,
                    dept: a.dept,
                    type: a.type,
                  })),
                },
              },
            }
          : { deleteMany: {} };
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
      detail: { changed },
    });

    return this.toResponse(row);
  }

  async updateStatus(
    req: UpdateContractStatusRequest,
  ): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const current = await this.ensureExists(req.id, ctx);
    const viewer = await this.loadViewer(req.viewerId);
    const authz = evaluate(viewer, this.toAuthzContract(current));

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

    if (isTransition) {
      await this.audit.record({
        action: "transition",
        targetType: "Contract",
        targetId: req.id,
        actorId: viewer?.id ?? "system",
        detail: { from: current.status, to: req.status },
      });
    }

    return this.toResponse(row);
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

  private toResponse(row: ContractWithRelations): ContractResponse {
    const line = row.approvalLines[0] ?? null;
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
              name: s.name,
              dept: s.dept,
              type: s.type,
              status: s.status,
            })),
          }
        : null,
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
