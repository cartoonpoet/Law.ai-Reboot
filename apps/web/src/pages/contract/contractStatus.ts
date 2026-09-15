import type { ContractClosedReason, ContractStatus } from "@lawai/contracts";

// 진행상태 enum → 한글 라벨(StatusBadge 가 한글 문자열을 색상에 매핑).
export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "임시 저장",
  unassigned: "미배정",
  assigning: "배정 중",
  legalReview: "법무 검토 중",
  requesterReview: "요청자 검토 중",
  reviewDone: "검토 완료",
  signing: "체결 진행",
  signed: "체결 완료",
  fulfilling: "계약 이행",
  closed: "계약 종료",
};

export const getStatusLabel = (status: ContractStatus): string =>
  CONTRACT_STATUS_LABEL[status] ?? status;

// 계약 종료 사유 → 한글 라벨.
export const CLOSED_REASON_LABEL: Record<ContractClosedReason, string> = {
  completed: "정상 종료",
  expired: "기간 만료",
  renewed: "갱신",
  terminated: "중도 해지",
};
