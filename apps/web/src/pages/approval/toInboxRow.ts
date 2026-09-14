import type { ApprovalInboxItem, ApproverType, StepStatus } from "@lawai/contracts";
import type { AiInsightTarget } from "../../components/ai/useAiInsights";
import { getDaysLeft } from "../dashboard/getDaysLeft";

// targetType → 상세 딥링크. 새 도메인이 결재를 쓰면 여기에 경로만 추가한다.
const TARGET_ROUTE: Record<string, (id: string) => string> = {
  contract: (id) => `/contract/${id}`,
};

// targetType → "결재 유형" 배지 라벨(문서 종류).
const TARGET_KIND_LABEL: Record<string, string> = {
  contract: "체결 품의",
};

// targetType → 문서 아래 보조 줄의 업무 이름("C20260908-0142 · 계약").
const TARGET_DOMAIN_LABEL: Record<string, string> = {
  contract: "계약",
};

// 내 단계 옆 역할 배지.
const ROLE_LABEL: Record<ApproverType, string> = {
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

export type ElapsedToneTypes = "today" | "overdue";

// "MM-DD" (ISO 기준).
const toMonthDay = (iso: string): string => iso.slice(5, 10);

export interface InboxRow {
  lineId: string;
  title: string;
  kindLabel: string;
  docMeta: string;
  submittedByName: string;
  submittedByDept: string;
  stepNumber: number;
  totalSteps: number;
  roleLabel: string;
  isAgree: boolean;
  submittedAtLabel: string;
  // 상신 후 지난 날 — 당일은 "오늘", 하루 이상 지나면 D+n(경고색)
  elapsedLabel: string;
  elapsedTone: ElapsedToneTypes;
  href: string;
  myStatus: StepStatus;
  myStatusLabel: string;
  myDecidedAtLabel: string | null;
  // 결재자용 AI 브리핑 — 계약 체결 품의는 상신 시 approvalBriefing 이 만들어진다. 다른 도메인은 아직 없음.
  aiTarget: AiInsightTarget | null;
}

export const toInboxRow = (item: ApprovalInboxItem, now: Date): InboxRow => {
  const elapsedDays = -(getDaysLeft(item.submittedAt, now) ?? 0);
  const domainLabel = TARGET_DOMAIN_LABEL[item.targetType] ?? "결재";
  return {
    lineId: item.lineId,
    title: item.title,
    kindLabel: TARGET_KIND_LABEL[item.targetType] ?? "결재",
    docMeta: item.targetCode ? `${item.targetCode} · ${domainLabel}` : domainLabel,
    submittedByName: item.submittedByName,
    submittedByDept: item.submittedByDept,
    stepNumber: item.myStepOrder + 1,
    totalSteps: item.totalSteps,
    roleLabel: ROLE_LABEL[item.myType],
    isAgree: item.myType === "agree",
    submittedAtLabel: toMonthDay(item.submittedAt),
    elapsedLabel: elapsedDays <= 0 ? "오늘" : `D+${elapsedDays}`,
    elapsedTone: elapsedDays <= 0 ? "today" : "overdue",
    href: TARGET_ROUTE[item.targetType]?.(item.targetId) ?? "/",
    myStatus: item.myStatus,
    myStatusLabel: MY_STATUS_LABEL[item.myStatus],
    myDecidedAtLabel: item.myDecidedAt ? toMonthDay(item.myDecidedAt) : null,
    aiTarget: item.targetType === "contract" ? { contractId: item.targetId, kind: "approvalBriefing" } : null,
  };
};
