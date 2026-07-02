import type { ContractStatus } from "@lawai/contracts";
import type { ContractCan } from "@lawai/contracts";

/**
 * 단계별 검토 액션 패널의 선언적 뷰모델.
 * data.status(ContractStatus) + can(edit/assign/transition/delete) 으로 순수 파생한다.
 * (렌더 중 계산 — useEffect/상태 동기화 금지)
 *
 * 시안 8단계 데모 → 실 status 매핑. 신규 전이 타깃(제출/품의 상신/재검토 등)은
 * 프론트에 ALLOWED_TRANSITIONS 가 없으므로 can 게이팅 범위 내에서만 노출한다(날조 0).
 */
export type ActionButtonKind =
  | "reject" // 반려 → changeStatus("requesterReview")
  | "reviewDone" // 검토 완료 → changeStatus("reviewDone")
  | "assign"; // 담당자 배정 → AssignModal

export interface ActionButton {
  kind: ActionButtonKind;
  label: string;
  color: "primary" | "danger" | "secondary";
  variant: "default" | "outline";
}

export interface ActionView {
  /** 우측 패널 헤더 라벨(검토 액션 / 결재 현황 등) */
  head: string;
  /** 결재 현황 모드(체결 품의 이후) — 반려/배정 버튼 숨기고 결재선 진행 표시 */
  isApprovalMode: boolean;
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

// 결재(체결 품의) 단계 이후 — 읽기 위주의 결재 현황 패널.
const APPROVAL_STATUSES: ReadonlySet<ContractStatus> = new Set([
  "signing",
  "signed",
  "fulfilling",
  "closed",
]);

export const getActionView = (
  status: ContractStatus,
  can: ContractCan,
): ActionView => {
  // 결재(체결 품의) 단계 이후: 결재 현황으로 전환(반려/배정 숨김, approvalLine 진행 표시).
  if (APPROVAL_STATUSES.has(status)) {
    return {
      head: "결재 현황",
      isApprovalMode: true,
      showAssignee: false,
      notice:
        status === "signing"
          ? "체결 품의 결재가 진행 중입니다."
          : "모든 결재가 완료되었습니다. (읽기 전용)",
      buttons: [],
    };
  }

  // 검토 단계: can 게이팅으로 반려/검토완료/배정 노출.
  const buttons: ActionButton[] = [];
  if (can.transition) {
    buttons.push(REJECT, REVIEW_DONE);
  }
  if (can.assign) {
    buttons.push(ASSIGN);
  }

  const isUnassigned = status === "unassigned" || status === "assigning";
  return {
    head: "검토 액션",
    isApprovalMode: false,
    showAssignee: !isUnassigned,
    notice: isUnassigned ? "법무팀 담당자 배정이 필요합니다." : null,
    buttons,
  };
};
