import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InviteMembersRequest, InviteMembersResponse } from "@lawai/contracts";
import {
  cancelInvite,
  inviteMembers,
  listTenantMembers,
  resendInvite,
} from "../../api/members";

export const MEMBERS_QUERY_KEY = ["tenantMembers"] as const;

// 멤버 관리 화면의 데이터·동작 집약 훅 (컨벤션: 로직은 use~ 훅으로 분리).
export const useMembers = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: MEMBERS_QUERY_KEY, queryFn: listTenantMembers });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });

  const inviteMutation = useMutation({
    mutationFn: (req: Pick<InviteMembersRequest, "emails" | "role">) =>
      inviteMembers(req),
    onSuccess: invalidate,
  });
  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => resendInvite(inviteId),
  });
  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(inviteId),
    onSuccess: invalidate,
  });

  return {
    members: query.data?.members ?? [],
    invites: query.data?.invites ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    invite: (req: Pick<InviteMembersRequest, "emails" | "role">): Promise<InviteMembersResponse> =>
      inviteMutation.mutateAsync(req),
    isInviting: inviteMutation.isPending,
    resend: (inviteId: string): Promise<{ ok: true }> => resendMutation.mutateAsync(inviteId),
    cancel: (inviteId: string): Promise<{ ok: true }> => cancelMutation.mutateAsync(inviteId),
  };
};
