import { useQuery } from "@tanstack/react-query";
import { getAiAnalysis } from "../../../api/ai";

// 대상(계약)의 AI 분석 결과 조회. kind=null 이면(해당 상태에서 AI 미제공) 조회하지 않는다.
// status 가 pending/running 이면 완료될 때까지 2초 간격 폴링(react-query refetchInterval).
export const useAiAnalysis = (targetId: string, kind: string | null) => {
  const query = useQuery({
    queryKey: ["aiAnalysis", "contract", targetId, kind],
    queryFn: () => getAiAnalysis("contract", targetId, kind ?? ""),
    enabled: Boolean(targetId) && kind !== null,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });
  return { analysis: query.data ?? null, isLoading: query.isLoading };
};
