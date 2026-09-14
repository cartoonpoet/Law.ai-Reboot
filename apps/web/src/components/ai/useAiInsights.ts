import { useQueries } from "@tanstack/react-query";
import { getAiAnalysis } from "../../api/ai";
import { summarizeAiAnalysis } from "./summarizeAiAnalysis";
import type { AiInsight } from "./summarizeAiAnalysis";

export interface AiInsightTarget {
  contractId: string;
  kind: string;
}

// 목록 한 화면에서 AI 분석을 동시에 부르는 최대 건수(앞에서부터).
const MAX_TARGETS = 20;
const POLL_MS = 5000;

export const getAiTargetKey = (target: AiInsightTarget) => `${target.contractId}:${target.kind}`;

/**
 * 여러 계약의 AI 분석 결과를 한 줄 요약으로 — 키(getAiTargetKey) → 요약(없으면 null).
 * 계약 상세(useAiAnalysis)와 같은 쿼리 키라 캐시를 같이 쓰고, 분석 중인 건만 천천히 다시 확인한다.
 */
export const useAiInsights = (targets: AiInsightTarget[]): Record<string, AiInsight | null> => {
  const uniqueTargets = [...new Map(targets.map((t) => [getAiTargetKey(t), t])).values()].slice(0, MAX_TARGETS);

  const queries = useQueries({
    queries: uniqueTargets.map((target) => ({
      queryKey: ["aiAnalysis", "contract", target.contractId, target.kind],
      queryFn: () => getAiAnalysis("contract", target.contractId, target.kind),
      refetchInterval: (query: { state: { data?: { status: string } | null } }) => {
        const status = query.state.data?.status;
        return status === "pending" || status === "running" ? POLL_MS : false;
      },
      // 보조 정보라 실패해도 목록은 그대로 — 토스트 없이 조용히
      meta: { errorMode: "silent" as const },
    })),
  });

  return Object.fromEntries(uniqueTargets.map((target, i) => [getAiTargetKey(target), summarizeAiAnalysis(queries[i].data ?? null)]));
};
