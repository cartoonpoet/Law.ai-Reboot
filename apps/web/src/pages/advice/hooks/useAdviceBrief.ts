import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAiAnalysis, retryAiAnalysis } from "../../../api/ai";

const TARGET_TYPE = "advice";
const KIND = "adviceBrief";

const getBriefQueryKey = (adviceId: string) => ["aiAnalysis", TARGET_TYPE, adviceId, KIND] as const;

/**
 * AI 자문 도우미 — 요청이 접수될 때 서버가 백그라운드로 만든다.
 * 아직 만드는 중(pending/running)이면 2초마다 다시 본다(계약 AI 카드와 같은 방식).
 */
export const useAdviceBrief = (adviceId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getBriefQueryKey(adviceId),
    queryFn: () => getAiAnalysis(TARGET_TYPE, adviceId, KIND),
    enabled: Boolean(adviceId),
    refetchInterval: (result) => {
      const status = result.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
    // 카드 안에서 상태를 보여주므로 실패해도 토스트를 띄우지 않는다.
    meta: { errorMode: "silent" },
  });

  const retryMutation = useMutation({
    meta: { errorTitle: "AI 분석을 다시 요청하지 못했어요" },
    mutationFn: () => retryAiAnalysis(TARGET_TYPE, adviceId, KIND),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getBriefQueryKey(adviceId) }),
  });

  return {
    analysis: query.data ?? null,
    isLoading: query.isLoading,
    retry: () => retryMutation.mutate(),
    isRetrying: retryMutation.isPending,
  };
};
