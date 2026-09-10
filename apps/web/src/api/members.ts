import type {
  InviteMembersRequest,
  InviteMembersResponse,
  ListTenantMembersResponse,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const listTenantMembers = (): Promise<ListTenantMembersResponse> =>
  apiFetch<ListTenantMembersResponse>("/tenants/members");

export const inviteMembers = (
  req: Pick<InviteMembersRequest, "emails" | "role">,
): Promise<InviteMembersResponse> =>
  apiFetch<InviteMembersResponse>("/tenants/invites", {
    method: "POST",
    body: JSON.stringify(req),
  });

export const resendInvite = (inviteId: string): Promise<{ ok: true }> =>
  apiFetch<{ ok: true }>(`/tenants/invites/${inviteId}/resend`, { method: "POST" });

export const cancelInvite = (inviteId: string): Promise<{ ok: true }> =>
  apiFetch<{ ok: true }>(`/tenants/invites/${inviteId}`, { method: "DELETE" });
