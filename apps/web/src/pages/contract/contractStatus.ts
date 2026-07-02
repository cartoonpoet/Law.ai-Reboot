import type { ContractStatus } from "@lawai/contracts";

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

// 목록 칩 필터에 노출할 주요 상태(요청~검토 흐름).
export const CONTRACT_STATUS_FILTERS: ContractStatus[] = [
  "unassigned",
  "legalReview",
  "requesterReview",
  "reviewDone",
];

export const getStatusLabel = (status: ContractStatus): string =>
  CONTRACT_STATUS_LABEL[status] ?? status;
