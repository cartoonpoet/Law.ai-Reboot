import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryAiAnalysis } from "../../../api/ai";

// AI 분석 재시도. retryAiAnalysis 자체는 void 를 반환하므로, 성공 시 해당
// aiAnalysis 쿼리를 무효화해 폴링(useAiAnalysis)이 새 상태(pending)를 다시 조회하게 한다.
export const useRetryAiAnalysis = (targetId: string, kind: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => retryAiAnalysis("contract", targetId, kind ?? ""),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["aiAnalysis", "contract", targetId, kind] }),
    meta: { errorTitle: "AI 분석을 다시 요청하지 못했어요" },
  });

  return {
    retry: () => mutation.mutate(),
    isRetrying: mutation.isPending,
  };
};
