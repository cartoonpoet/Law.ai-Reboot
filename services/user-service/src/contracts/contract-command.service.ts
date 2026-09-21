// 계약 작성·수정·삭제(쓰기): create / update / remove.
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { CATEGORY_LABEL_SEPARATOR } from "@lawai/contracts";
import type {
  ApproverSnapshot,
  ContractDetailsV1,
  ContractResponse,
  ContractStatus,
  CreateContractRequest,
  DeleteContractRequest,
  DeleteContractResult,
  TenantContext,
  UpdateContractRequest,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { StatusEventsService } from "../common/status-events/status-events.service";
import { R2Client } from "../files/r2.client";
import { resolveTenantId, tenantScope } from "../common/tenant-scope";
import { AuditService } from "./contracts.audit";
import { evaluate } from "./contracts.authz";
import { ContractAiTriggers } from "./contract-ai-triggers";
import { raiseStaleConflict } from "./contract-errors";
import {
  getAdditiveOnlyViolation,
  getSignedFileViolation,
  isContractFileReplaced,
} from "./contract-file-policy";
import { getFileLockViolation } from "./contract-file-lock";
import { ensureContractExists, loadViewer } from "./contract-loaders";
import { recordContractStatus } from "./contract-status-events";
import {
  ORIGIN_REQUIRED_STAGES,
  PRECHECK_STATUSES,
  RISK_RECHECK_STATUSES,
  TERMINABLE_STATUSES,
} from "./contract-transitions";
import { contractInclude, parseDate, toAuthzContract, toResponse } from "./contract.mapper";

// 관리번호: C{YYYYMMDD}-{4자리}. 충돌 시 호출부에서 재시도(unique 제약).
const generateCode = (): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `C${ymd}-${seq}`;
};

@Injectable()
export class ContractCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly r2: R2Client,
    private readonly statusEvents: StatusEventsService,
    private readonly aiTriggers: ContractAiTriggers,
  ) {}

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
      recordContractStatus(this.statusEvents, row, null, row.status, req.createdById);
      const response = toResponse(row);
      // 검토 경로(계약서 원본, role=contract)만 create 시점에 사전 점검(precheck)을 돌린다.
      // 체결 완료 등록(registerAs=signed)은 이 시점엔 실제 서명본이 없을 수 있으므로(위 주석
      // 참고) risk 분석은 finalizeRegistration() 이 실제 파일 확인 후 트리거한다.
      if (req.files.some((f) => f.role === "contract")) {
        this.aiTriggers.triggerWithContractText({
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

  async update(req: UpdateContractRequest): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const current = await ensureContractExists(this.prisma, req.id, ctx);

    // 수정 권한(canEdit) 가드 — 중앙 authz 결과만 사용.
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(current));
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
      // authz 참고): 기존 파일은 하나도 제거할 수 없다(contract-file-policy 참고).
      if (authz.editIsAdditiveOnly) {
        const existingFiles = await this.prisma.file.findMany({
          where: { contractId: req.id, commentId: null },
          select: { id: true },
        });
        const additiveViolation = getAdditiveOnlyViolation(existingFiles, keepIds);
        if (additiveViolation) {
          throw new RpcException({ status: 400, message: additiveViolation });
        }
      }

      // 서명본(role=signed) 보호 — 이미 R2 에 올라간 서명 원본이 이 PATCH 로 조용히 사라지는
      // 사고를 서버에서 원천 차단한다(판정 규칙은 contract-file-policy 참고).
      // 모든 거부는 아래 deleteMany/R2 삭제 후보 계산·contract.update 보다 먼저 일어난다.
      const existingSignedFiles = await this.prisma.file.findMany({
        where: { contractId: req.id, commentId: null, role: "signed" },
        select: { id: true, storageKey: true },
      });
      const signedViolation = getSignedFileViolation(existingSignedFiles, req.files);
      if (signedViolation) {
        throw new RpcException({ status: 400, message: signedViolation });
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

    const response = toResponse(row);

    // spec §6: risk 는 "legalReview 진입 또는 계약서 파일 교체 시" 트리거된다.
    // 검토 중 문서가 바뀌면 기존 위험 분석은 현재 문서와 어긋나므로 다시 돌린다.
    // 담당자(owner) 미배정이면 자격증명 주체가 없어 건너뛴다(상태 전이 트리거와 동일).
    if (
      req.files !== undefined &&
      RISK_RECHECK_STATUSES.includes(current.status as ContractStatus) &&
      row.ownerId &&
      isContractFileReplaced(current.files, req.files)
    ) {
      this.aiTriggers.triggerWithContractText({
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
      this.aiTriggers.triggerWithContractText({
        kind: "precheck",
        contract: response,
        tenantId: row.tenantId,
        triggeredByUserId: row.createdById,
      });
    }

    return response;
  }

  /** 계약 삭제(소프트 삭제) — deletedAt 을 채워 목록·상세·검색·코멘트·파일 다운로드·AI 비서에서 제외한다.
   *  파일(R2)·변경 기록은 보존한다(잘못 지웠을 때 관리자가 되살릴 수 있게).
   *  권한: 담당자 배정 전 생성자 본인(authz.canDelete — 잘못 만든 요청 정리) 또는 시스템 관리자.
   *  체결 결재 진행 중(signing)에는 막는다 — 결재자 대기함에 삭제된 계약의 결재가 남기 때문이다. */
  async remove(req: DeleteContractRequest): Promise<DeleteContractResult> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.id, ctx);

    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(row));
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
      raiseStaleConflict(error, "이미 삭제되었거나 상태가 변경된 계약입니다");
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
}
