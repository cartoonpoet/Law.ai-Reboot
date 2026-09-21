// 계약 생애주기 전이: 상태 변경·상신·체결·등록 확정·서명본 교체·중도 해지.
// 각 메서드는 "권한·상태·파일 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다".
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  ApproverSnapshot,
  CompleteSigningRequest,
  CompleteSigningResult,
  ContractResponse,
  ContractStage,
  ContractStatus,
  FinalizeRegistrationRequest,
  FinalizeRegistrationResult,
  ReplaceSignedFileRequest,
  ReplaceSignedFileResult,
  SubmitContractApprovalRequest,
  SubmitContractApprovalResult,
  TerminateContractRequest,
  TerminateContractResult,
  UpdateContractStatusRequest,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { StatusEventsService } from "../common/status-events/status-events.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { tenantScope } from "../common/tenant-scope";
import { AuditService } from "./contracts.audit";
import { evaluate } from "./contracts.authz";
import { ContractAiTriggers } from "./contract-ai-triggers";
import { raiseStaleConflict } from "./contract-errors";
import { ensureContractExists, loadViewer } from "./contract-loaders";
import { recordContractStatus } from "./contract-status-events";
import {
  ALLOWED_TRANSITIONS,
  ORIGIN_CLOSE_BY_STAGE,
  POST_SIGN_STATUSES,
  TERMINABLE_STATUSES,
  TERMINATION_REASON_LABEL,
} from "./contract-transitions";
import {
  contractInclude,
  parseDate,
  toAuthzContract,
  toResponse,
  type ContractWithRelations,
} from "./contract.mapper";

@Injectable()
export class ContractLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly approvals: ApprovalsService,
    private readonly statusEvents: StatusEventsService,
    private readonly aiTriggers: ContractAiTriggers,
  ) {}

  // 갱신·해지 계약이 체결되면 원 계약을 즉시 종료(갱신됨·중도 해지)한다. 원 계약이 이미 끝났거나 지워졌으면 그대로 둔다.
  private async closeOriginOnSigning(
    signed: ContractWithRelations,
    signedAt: Date,
    actorId: string,
  ): Promise<void> {
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

    if (origin) recordContractStatus(this.statusEvents, origin, origin.status, "closed", actorId);

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

  async updateStatus(
    req: UpdateContractStatusRequest,
  ): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const current = await ensureContractExists(this.prisma, req.id, ctx);
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(current));

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

    const response = toResponse(row);

    if (isTransition) {
      await this.audit.record({
        action: "transition",
        targetType: "Contract",
        targetId: req.id,
        actorId: viewer?.id ?? "system",
        tenantId: row.tenantId,
        detail: { from: current.status, to: req.status },
      });
      recordContractStatus(this.statusEvents, row, current.status, req.status, viewer?.id ?? null);
      // legalReview 진입: 담당자(owner) 배정 전이면 트리거 자체를 건너뛴다(AiAnalysisService 의
      // 자격증명 없음 처리와 동일하게, 호출부에서 미리 걸러 불필요한 skipped 행 생성을 피함).
      if (req.status === "legalReview" && row.ownerId) {
        this.aiTriggers.triggerWithContractText({
          kind: "risk",
          contract: response,
          tenantId: row.tenantId,
          triggeredByUserId: row.ownerId,
        });
      }
      // reviewDone 진입: 상신 전 결재자용 요약(submitBriefing)을 백그라운드로 트리거.
      if (req.status === "reviewDone") {
        this.aiTriggers.triggerSubmitBriefing(response, row.tenantId, row.createdById);
      }
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
    const row = await ensureContractExists(this.prisma, req.id, ctx);
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
    recordContractStatus(this.statusEvents, updated, "reviewDone", "signing", req.viewerId ?? null);
    const response = toResponse(updated, line);
    // 상신 성공 후 결재자용 브리핑(approvalBriefing)을 백그라운드로 트리거.
    this.aiTriggers.triggerApprovalBriefing(response, line, row.tenantId, req.viewerId!);
    return { contract: response, notifications };
  }

  /** 체결 처리 — 결재가 전원 승인된 signing 계약을 signed 로 확정한다.
   *  권한·상태·결재 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다. */
  async completeSigning(
    req: CompleteSigningRequest,
  ): Promise<CompleteSigningResult> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.contractId, ctx);

    // sealManager 는 status === "signing" 일 때만 canTransition 이 true 다(authz 특수 처리).
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(row));
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
      raiseStaleConflict(error);
    }

    // audit 는 트랜잭션 커밋 후 best-effort 로 기록한다(AuditService.record 는 실패를
    // 삼키도록 설계돼 있으므로, 감사 기록 실패가 이미 커밋된 체결 처리를 되돌리지 않는다).
    recordContractStatus(this.statusEvents, updated, "signing", "signed", req.viewerId);
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
    const response = toResponse(updated, active.line);
    // 만료 관리용 자동갱신·해지 통지 조항 추출 — 요청자(생성자)의 AI 연동으로 백그라운드 실행.
    this.aiTriggers.triggerWithContractText({
      kind: "renewalTerms",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: row.createdById,
    });
    return { contract: response };
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
  async finalizeRegistration(
    req: FinalizeRegistrationRequest,
  ): Promise<FinalizeRegistrationResult> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.contractId, ctx);

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
      raiseStaleConflict(error);
    }

    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: { kind: "finalizeRegistration", from: "unassigned", to: "signed" },
    });
    recordContractStatus(this.statusEvents, updated, "unassigned", "signed", req.viewerId);

    await this.closeOriginOnSigning(updated, signedAt, req.viewerId);

    const response = toResponse(updated);
    // create() 시점엔 미룬 risk 분석을 여기서 트리거한다 — 이제야 실제 서명본 내용이 있다.
    this.aiTriggers.triggerWithContractText({
      kind: "risk",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: req.viewerId,
    });
    // 만료 관리용 자동갱신·해지 통지 조항 추출(체결 처리와 같은 규칙).
    this.aiTriggers.triggerWithContractText({
      kind: "renewalTerms",
      contract: response,
      tenantId: row.tenantId,
      triggeredByUserId: row.createdById,
    });

    return { contract: response };
  }

  /** 서명본 교체 — 체결된 계약의 서명본을 잘못 올렸을 때 법무팀이 새 파일로 바꾼다.
   *  편집(PATCH)은 서명본 교체·삭제를 막으므로(§5.4) 이 전용 경로로만 바꿀 수 있다.
   *  기존 서명본은 지우지 않고 첨부로 내려 이력으로 남기며(법적 원본 추적), 사유는 감사 로그에 남긴다.
   *  권한·상태·파일 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다. */
  async replaceSignedFile(
    req: ReplaceSignedFileRequest,
  ): Promise<ReplaceSignedFileResult> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.contractId, ctx);

    if (!POST_SIGN_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결된 계약만 서명본을 교체할 수 있습니다" });
    }
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(row));
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
      raiseStaleConflict(error);
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
    return { contract: toResponse(updated, active.line) };
  }

  /** 중도 해지 — 체결 완료·계약 이행 계약을 해지일·사유·해지 합의서(통지서)와 함께 종료(terminated)한다. */
  async terminate(req: TerminateContractRequest): Promise<TerminateContractResult> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.contractId, ctx);

    if (!TERMINABLE_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결 완료·계약 이행 중인 계약만 해지할 수 있습니다" });
    }
    // 권한은 이행 시작·계약 종료와 같다(법무팀·담당자·요청자 — authz 체결 이후 규칙).
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(row));
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
      raiseStaleConflict(error);
    }

    recordContractStatus(this.statusEvents, updated, row.status, "closed", req.viewerId);
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

    return { contract: toResponse(updated) };
  }
}
