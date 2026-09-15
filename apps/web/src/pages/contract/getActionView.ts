import type { ContractStatus } from "@lawai/contracts";
import type { ContractCan } from "@lawai/contracts";

/**
 * 단계별 검토 액션 패널의 선언적 뷰모델.
 * data.status(ContractStatus) + can(edit/assign/transition/delete) + approval(결재 컨텍스트) 으로
 * 순수 파생한다(렌더 중 계산 — useEffect/상태 동기화 금지).
 *
 * 시안 8단계 데모 → 실 status 매핑. 신규 전이 타깃(제출/재검토 등)은
 * 프론트에 ALLOWED_TRANSITIONS 가 없으므로 can 게이팅 범위 내에서만 노출한다(날조 0).
 * 체결 품의(상신/결재 승인·반려)는 결재 모듈 전용 RPC 라 can 이 아닌 approval 컨텍스트로 게이팅한다.
 */
export type ActionButtonKind =
  | "reject" // 반려 → changeStatus("requesterReview")
  | "reviewDone" // 검토 완료 → changeStatus("reviewDone")
  | "startReview" // 검토 시작·다시 검토 → changeStatus("legalReview")
  | "assign" // 담당자 배정 → AssignModal
  | "submitApproval" // 체결 품의 상신 → submitContractApproval
  | "approveStep" // 결재 승인 → decideApproval(approve)
  | "rejectStep" // 결재 반려 → ApprovalRejectModal → decideApproval(reject)
  | "completeSigning" // 체결 처리 → CompleteSigningModal → completeSigning API
  | "startFulfilling" // 이행 시작 → 확인 창 → changeStatus("fulfilling")
  | "closeContract"; // 계약 종료 → 확인 창 → changeStatus("closed")

export interface ActionButton {
  kind: ActionButtonKind;
  label: string;
  color: "primary" | "danger" | "secondary";
  variant: "default" | "outline";
  disabled?: boolean;
}

export interface ActionView {
  /** 우측 패널 헤더 라벨(검토 액션 / 체결 품의 / 결재 현황 등) */
  head: string;
  /** 결재 현황 모드(체결 품의 이후) — 반려/배정 버튼 숨기고 결재선 진행 표시 */
  isApprovalMode: boolean;
  /** 상신 모드(검토 완료 + 요청자 본인) — 사전점검 체크리스트 + 상신 버튼 노출 */
  isSubmitMode: boolean;
  /** 결재 처리 모드(체결 진행 + 내 차례) — 의견 입력 + 승인/반려 버튼 노출 */
  isDecideMode: boolean;
  /** 담당자(법무팀) 블록 표시 여부 */
  showAssignee: boolean;
  /** 안내 문구(없으면 null) */
  notice: string | null;
  /** can 게이팅을 거친 노출 버튼 목록 */
  buttons: ActionButton[];
}

const REJECT: ActionButton = {
  kind: "reject",
  label: "반려",
  color: "danger",
  variant: "outline",
};
const REVIEW_DONE: ActionButton = {
  kind: "reviewDone",
  label: "검토 완료",
  color: "primary",
  variant: "default",
};
const ASSIGN: ActionButton = {
  kind: "assign",
  label: "담당자 배정",
  color: "secondary",
  variant: "outline",
};
const START_REVIEW: ActionButton = {
  kind: "startReview",
  label: "검토 시작",
  color: "primary",
  variant: "default",
};
const RE_REVIEW: ActionButton = {
  kind: "startReview",
  label: "다시 검토",
  color: "secondary",
  variant: "outline",
};

// 검토 단계 전이 버튼 — 서버 ALLOWED_TRANSITIONS 와 1:1 이어야 한다. 허용되지 않는 전이 버튼은
// 400 으로 막혀 프로세스가 멈춘다(배정 중에 반려/검토완료만 보이고 "검토 시작"이 없어 진행 불가였음).
//  assigning → legalReview / legalReview → requesterReview·reviewDone
//  requesterReview → legalReview·reviewDone / reviewDone → legalReview
const TRANSITION_BUTTONS: Partial<Record<ContractStatus, ActionButton[]>> = {
  assigning: [START_REVIEW],
  legalReview: [REJECT, REVIEW_DONE],
  requesterReview: [RE_REVIEW, REVIEW_DONE],
  reviewDone: [RE_REVIEW],
};

// 체결 이후 진행 버튼 — 서버 ALLOWED_TRANSITIONS(signed→fulfilling, fulfilling→closed)와 1:1.
const POST_SIGN_PROGRESS: Partial<Record<ContractStatus, { button: ActionButton; notice: string }>> = {
  signed: {
    button: { kind: "startFulfilling", label: "이행 시작", color: "primary", variant: "default" },
    notice: "체결이 끝났어요. 계약 이행을 시작하면 '계약 이행' 단계로 넘어가요.",
  },
  fulfilling: {
    button: { kind: "closeContract", label: "계약 종료", color: "secondary", variant: "outline" },
    notice: "계약을 이행하고 있어요. 기간이 끝났거나 의무를 모두 마쳤으면 계약을 종료하세요.",
  },
};

// 결재(체결 품의) 단계 이후 — 읽기 위주의 결재 현황 패널.
const APPROVAL_STATUSES: ReadonlySet<ContractStatus> = new Set([
  "signing",
  "signed",
  "fulfilling",
  "closed",
]);

// 버튼 없는 결재 현황의 안내 — 진행 권한이 없거나 더 넘길 단계가 없을 때.
const READ_ONLY_NOTICE: Partial<Record<ContractStatus, string>> = {
  signing: "체결 품의 결재가 진행 중입니다.",
  closed: "종료된 계약입니다. (읽기 전용)",
};

export interface ApprovalActionContext {
  /** 계약 요청자(createdById) 본인 여부 — 체결 품의 상신 주체. */
  isRequester: boolean;
  /** 활성 결재 라인의 현재 차례가 나인지 여부. */
  isMyTurn: boolean;
  /** 상신 사전점검(getSubmitPrecheck) 통과 여부. */
  canSubmit: boolean;
  /** 활성 결재 라인이 전원 승인(approved) 되었는지. 체결 처리 게이트. */
  isApprovalComplete: boolean;
}

const NO_APPROVAL: ApprovalActionContext = {
  isRequester: false,
  isMyTurn: false,
  canSubmit: false,
  isApprovalComplete: false,
};

export const getActionView = (
  status: ContractStatus,
  can: ContractCan,
  approval: ApprovalActionContext = NO_APPROVAL,
): ActionView => {
  // 결재(체결 품의) 단계 이후: 결재 현황으로 전환(반려/배정 숨김, approvalLine 진행 표시).
  if (APPROVAL_STATUSES.has(status)) {
    // 체결 진행 중 + 내 차례: 의견 입력 + 승인/반려 노출.
    if (status === "signing" && approval.isMyTurn) {
      return {
        head: "결재 현황",
        isApprovalMode: true,
        isSubmitMode: false,
        isDecideMode: true,
        showAssignee: false,
        notice: null,
        buttons: [
          {
            kind: "rejectStep",
            label: "반려",
            color: "danger",
            variant: "outline",
          },
          {
            kind: "approveStep",
            label: "승인",
            color: "primary",
            variant: "default",
          },
        ],
      };
    }
    // 결재 전원 승인 + 전이 권한(=sealManager 이고 signing) → 체결 처리.
    if (status === "signing" && approval.isApprovalComplete && can.transition) {
      return {
        head: "체결 처리",
        isApprovalMode: true,
        isSubmitMode: false,
        isDecideMode: false,
        showAssignee: false,
        notice:
          "모든 결재가 완료되었습니다. 서명·날인이 끝난 계약서를 등록하면 체결 완료로 확정됩니다.",
        buttons: [
          {
            kind: "completeSigning",
            label: "체결 처리",
            color: "primary",
            variant: "default",
          },
        ],
      };
    }

    // 체결 이후 + 진행 권한(법무팀·담당자·요청자) → 이행 시작 / 계약 종료.
    const progress = can.transition ? POST_SIGN_PROGRESS[status] : undefined;
    if (progress) {
      return {
        head: "계약 이행",
        isApprovalMode: true,
        isSubmitMode: false,
        isDecideMode: false,
        showAssignee: false,
        notice: progress.notice,
        buttons: [progress.button],
      };
    }

    return {
      head: "결재 현황",
      isApprovalMode: true,
      isSubmitMode: false,
      isDecideMode: false,
      showAssignee: false,
      notice: READ_ONLY_NOTICE[status] ?? "모든 결재가 완료되었습니다. (읽기 전용)",
      buttons: [],
    };
  }

  // 검토 완료 + 요청자 본인: 체결 품의 상신 모드(사전점검 + 상신 버튼).
  if (status === "reviewDone" && approval.isRequester) {
    return {
      head: "체결 품의",
      isApprovalMode: false,
      isSubmitMode: true,
      isDecideMode: false,
      showAssignee: true,
      notice: null,
      buttons: [
        {
          kind: "submitApproval",
          label: "체결 품의 상신",
          color: "primary",
          variant: "default",
          disabled: !approval.canSubmit,
        },
      ],
    };
  }

  // 검토 단계: 현재 상태에서 허용된 전이 버튼(can.transition) + 배정(can.assign).
  const buttons: ActionButton[] = [
    ...(can.transition ? (TRANSITION_BUTTONS[status] ?? []) : []),
    ...(can.assign ? [ASSIGN] : []),
  ];

  // 배정 중(assigning)은 이미 담당자가 정해진 상태 — 배정 필요 안내는 미배정일 때만.
  const isUnassigned = status === "unassigned";
  return {
    head: "검토 액션",
    isApprovalMode: false,
    isSubmitMode: false,
    isDecideMode: false,
    showAssignee: !isUnassigned,
    notice: isUnassigned ? "법무팀 담당자 배정이 필요합니다." : null,
    buttons,
  };
};
