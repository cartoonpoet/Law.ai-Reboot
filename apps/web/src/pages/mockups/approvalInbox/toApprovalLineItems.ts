import type { MockInboxItem } from "./approvalInboxMockData";

type ApprovalLineStatusTypes = "approved" | "current" | "pending" | "rejected";

const STEP_STATUS: Record<MockInboxItem["steps"][number]["state"], ApprovalLineStatusTypes> = {
  done: "approved",
  now: "current",
  wait: "pending",
};

/** 시안 결재선 → lawkit ApprovalLine 항목. */
export const toApprovalLineItems = (item: MockInboxItem) =>
  item.steps.map((step, index) => ({
    id: step.id,
    order: index + 1,
    name: step.name,
    role: step.role,
    department: step.dept,
    status: STEP_STATUS[step.state],
    date: step.decidedAt ?? undefined,
    comment: step.comment ?? undefined,
  }));
