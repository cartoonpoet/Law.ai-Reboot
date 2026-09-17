import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdviceMessageKindTypes, AdviceResponse, ApproverSnapshot } from "@lawai/contracts";
import {
  addAdviceMessage,
  assignAdvice,
  closeAdvice,
  getAdvice,
  resubmitAdviceRequestApproval,
} from "../../../api/advices";
import { decideApproval } from "../../../api/approvals";
import { showToast } from "../../../lib/toast/toastStore";
import { ADVICES_QUERY_KEY } from "./useAdvicesList";

export const getAdviceQueryKey = (id: string) => ["advice", id] as const;

export interface AdviceMessageInput {
  kind: AdviceMessageKindTypes;
  body: string;
  approvers?: ApproverSnapshot[];
}

const MESSAGE_SENT_TITLE: Record<AdviceMessageKindTypes, string> = {
  followup: "추가 질의를 보냈어요",
  reply: "답변을 보냈어요",
  answer: "회신했어요",
};

interface DecideInput {
  lineId: string;
  decision: "approve" | "reject";
  comment: string;
}

// 자문 상세 + 진행 동작(배정·질의/회신·종결). 동작이 성공하면 서버가 준 최신 상세로 바로 바꾸고 목록은 다시 받는다.
export const useAdviceDetail = (id: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getAdviceQueryKey(id),
    queryFn: () => getAdvice(id),
    enabled: Boolean(id),
    // 상세의 주 데이터 — 없음(404)·서버 오류는 본문을 오류 페이지로.
    meta: { errorMode: "page" },
  });

  const applyResult = (advice: AdviceResponse) => {
    queryClient.setQueryData(getAdviceQueryKey(id), advice);
    void queryClient.invalidateQueries({ queryKey: [ADVICES_QUERY_KEY] });
  };

  const assignMutation = useMutation({
    meta: { errorTitle: "담당을 배정하지 못했어요" },
    mutationFn: (ownerId: string) => assignAdvice(id, ownerId),
    onSuccess: (advice) => {
      applyResult(advice);
      showToast({ intent: "success", title: `${advice.owner?.name ?? "담당자"} 님에게 배정했어요` });
    },
  });

  const messageMutation = useMutation({
    meta: { errorTitle: "보내지 못했어요" },
    mutationFn: (message: AdviceMessageInput) => addAdviceMessage(id, message),
    onSuccess: (advice, { kind }) => {
      applyResult(advice);
      const isAnswerApproval = kind === "answer" && advice.status === "answerApproval";
      showToast({ intent: "success", title: isAnswerApproval ? "회신 결재를 올렸어요" : MESSAGE_SENT_TITLE[kind] });
    },
  });

  // 결재 승인·반려는 공용 결재 API — 확정되면 자문 상태가 바뀌므로 상세를 다시 받는다.
  const decideMutation = useMutation({
    meta: { errorTitle: "결재를 처리하지 못했어요" },
    mutationFn: ({ lineId, decision, comment }: DecideInput) =>
      decideApproval(lineId, { decision, comment: comment.trim() || undefined }),
    onSuccess: (_line, { decision }) => {
      void queryClient.invalidateQueries({ queryKey: getAdviceQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: [ADVICES_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["approvalInbox"] });
      showToast({ intent: "success", title: decision === "approve" ? "승인했어요" : "반려했어요" });
    },
  });

  const resubmitMutation = useMutation({
    meta: { errorTitle: "결재를 다시 올리지 못했어요" },
    mutationFn: (approvers: ApproverSnapshot[]) => resubmitAdviceRequestApproval(id, approvers),
    onSuccess: (advice) => {
      applyResult(advice);
      showToast({
        intent: "success",
        title: advice.status === "requestApproval" ? "요청 결재를 다시 올렸어요" : "결재 없이 접수했어요",
      });
    },
  });

  const closeMutation = useMutation({
    meta: { errorTitle: "종결하지 못했어요" },
    mutationFn: () => closeAdvice(id),
    onSuccess: (advice) => {
      applyResult(advice);
      showToast({ intent: "success", title: "자문을 종결했어요" });
    },
  });

  return {
    advice: query.data ?? null,
    isLoading: query.isLoading,
    assign: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
    sendMessage: messageMutation.mutate,
    isSending: messageMutation.isPending,
    close: () => closeMutation.mutate(),
    isClosing: closeMutation.isPending,
    decide: decideMutation.mutate,
    isDeciding: decideMutation.isPending,
    resubmitRequestApproval: resubmitMutation.mutate,
    isResubmitting: resubmitMutation.isPending,
  };
};
