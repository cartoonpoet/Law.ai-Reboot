import type { Approver } from "../../contract/request-schema";

interface DraftUser {
  id: string;
  name: string;
  departmentName: string | null;
}

// 결재선 첫 줄 — 올리는 사람 본인을 기안자로 둔다.
export const createDraftApprover = (me: DraftUser): Approver => ({
  userId: me.id,
  name: me.name,
  dept: me.departmentName ?? "",
  type: "draft",
});

// 결재·합의 단계가 있어야 실제로 결재를 거친다(기안·참조만 있으면 결재 없이 진행).
export const checkNeedsApproval = (approvers: Approver[]): boolean =>
  approvers.some((approver) => approver.type === "approve" || approver.type === "agree");
