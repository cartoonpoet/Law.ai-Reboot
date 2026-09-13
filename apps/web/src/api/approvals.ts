// 결재(범용) API — 대기함 조회 + 승인/반려.
import type { ApprovalInboxResponse, ApprovalLineDto } from "@lawai/contracts";
import { apiFetch } from "./client";

export const getApprovalInbox = (): Promise<ApprovalInboxResponse> =>
  apiFetch<ApprovalInboxResponse>("/approvals/inbox");

export const decideApproval = (
  lineId: string,
  body: { decision: "approve" | "reject"; comment?: string },
): Promise<ApprovalLineDto> =>
  apiFetch<ApprovalLineDto>(`/approvals/${lineId}/decide`, {
    method: "POST",
    body: JSON.stringify(body),
  });
