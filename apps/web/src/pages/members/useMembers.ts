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
  // 화면의 주 데이터 — 실패하면 본문을 오류 페이지로.
  const query = useQuery({ queryKey: MEMBERS_QUERY_KEY, queryFn: listTenantMembers, meta: { errorMode: "page" } });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });

  const inviteMutation = useMutation({
    mutationFn: (req: Pick<InviteMembersRequest, "emails" | "role">) =>
      inviteMembers(req),
    onSuccess: invalidate,
    // 초대 실패는 InviteMembersModal 이 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });
  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => resendInvite(inviteId),
    meta: { errorTitle: "초대 메일을 다시 보내지 못했어요" },
  });
  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(inviteId),
    onSuccess: invalidate,
    meta: { errorTitle: "초대를 취소하지 못했어요" },
  });

  return {
    members: query.data?.members ?? [],
    invites: query.data?.invites ?? [],
    isLoading: query.isLoading,
    invite: (req: Pick<InviteMembersRequest, "emails" | "role">): Promise<InviteMembersResponse> =>
      inviteMutation.mutateAsync(req),
    isInviting: inviteMutation.isPending,
    resend: (inviteId: string): Promise<{ ok: true }> => resendMutation.mutateAsync(inviteId),
    cancel: (inviteId: string): Promise<{ ok: true }> => cancelMutation.mutateAsync(inviteId),
  };
};
