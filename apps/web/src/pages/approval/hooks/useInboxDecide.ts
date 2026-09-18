import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decideApproval } from "../../../api/approvals";
import { showToast } from "../../../lib/toast/toastStore";
import { APPROVAL_INBOX_QUERY_KEY } from "./useApprovalInbox";

interface DecideInput {
  lineId: string;
  decision: "approve" | "reject";
  comment?: string;
}

/**
 * 대기함에서 바로 결재 — 목록에서 승인·반려하고, 여러 건을 골라 한꺼번에 승인한다.
 * 확정되면 대상 문서 상태도 바뀌므로 대기함·계약·자문 목록을 모두 다시 받는다.
 */
export const useInboxDecide = () => {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: APPROVAL_INBOX_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    void queryClient.invalidateQueries({ queryKey: ["advices"] });
  };

  const decide = useMutation({
    meta: { errorTitle: "결재를 처리하지 못했어요" },
    mutationFn: ({ lineId, decision, comment }: DecideInput) =>
      decideApproval(lineId, { decision, comment: comment?.trim() || undefined }),
    onSuccess: (_line, { decision }) => {
      refresh();
      showToast({ intent: "success", title: decision === "approve" ? "승인했어요" : "반려했어요" });
    },
  });

  // 한 건이라도 실패하면 그 자리에서 멈춘다(앞서 승인된 건은 그대로 남는다).
  const approveMany = useMutation({
    meta: { errorTitle: "일부 결재를 처리하지 못했어요" },
    mutationFn: async (lineIds: string[]) => {
      for (const lineId of lineIds) {
        await decideApproval(lineId, { decision: "approve" });
      }
      return lineIds.length;
    },
    onSuccess: (count) => {
      refresh();
      showToast({ intent: "success", title: `${count}건을 승인했어요` });
    },
    onError: () => refresh(),
  });

  return {
    decide: decide.mutate,
    isDeciding: decide.isPending,
    approveMany: approveMany.mutate,
    isApprovingMany: approveMany.isPending,
  };
};
