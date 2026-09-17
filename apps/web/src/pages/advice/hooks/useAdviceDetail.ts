import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdviceMessageKindTypes, AdviceResponse } from "@lawai/contracts";
import { addAdviceMessage, assignAdvice, closeAdvice, getAdvice } from "../../../api/advices";
import { showToast } from "../../../lib/toast/toastStore";
import { ADVICES_QUERY_KEY } from "./useAdvicesList";

export const getAdviceQueryKey = (id: string) => ["advice", id] as const;

const MESSAGE_SENT_TITLE: Record<AdviceMessageKindTypes, string> = {
  followup: "추가 질의를 보냈어요",
  reply: "답변을 보냈어요",
  answer: "회신했어요",
};

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
    mutationFn: ({ kind, body }: { kind: AdviceMessageKindTypes; body: string }) => addAdviceMessage(id, kind, body),
    onSuccess: (advice, { kind }) => {
      applyResult(advice);
      showToast({ intent: "success", title: MESSAGE_SENT_TITLE[kind] });
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
  };
};
