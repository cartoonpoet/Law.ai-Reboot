import type { ApprovalInboxItem, ApproverType, StepStatus } from "@lawai/contracts";

// targetType → 상세 딥링크. 새 도메인이 결재를 쓰면 여기에 경로만 추가한다.
const TARGET_ROUTE: Record<string, (id: string) => string> = {
  contract: (id) => `/contract/${id}`,
};

// targetType → 대기함 "결재 유형" 배지 라벨.
const TARGET_KIND_LABEL: Record<string, string> = {
  contract: "체결 품의",
};

const TYPE_LABEL: Record<ApproverType, string> = {
  draft: "기안",
  approve: "결재",
  agree: "합의",
  refer: "참조",
};

const MY_STATUS_LABEL: Record<StepStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

// "MM-DD" (submittedAt ISO 기준).
const toMonthDay = (iso: string): string => iso.slice(5, 10);

export interface InboxRow {
  lineId: string;
  title: string;
  kindLabel: string;
  submittedByName: string;
  submittedByDept: string;
  stepLabel: string;
  typeLabel: string;
  submittedAtLabel: string;
  href: string;
  myStatus: StepStatus;
  myStatusLabel: string;
  myDecidedAtLabel: string | null;
}

export const toInboxRow = (item: ApprovalInboxItem): InboxRow => ({
  lineId: item.lineId,
  title: item.title,
  kindLabel: TARGET_KIND_LABEL[item.targetType] ?? "결재",
  submittedByName: item.submittedByName,
  submittedByDept: item.submittedByDept,
  stepLabel: `${item.myStepOrder + 1}/${item.totalSteps}`,
  typeLabel: TYPE_LABEL[item.myType],
  submittedAtLabel: toMonthDay(item.submittedAt),
  href: TARGET_ROUTE[item.targetType]?.(item.targetId) ?? "/",
  myStatus: item.myStatus,
  myStatusLabel: MY_STATUS_LABEL[item.myStatus],
  myDecidedAtLabel: item.myDecidedAt ? toMonthDay(item.myDecidedAt) : null,
});
