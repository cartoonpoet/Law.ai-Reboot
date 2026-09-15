import { useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { AiAnalysisDto } from "@lawai/contracts";
import { getAiAnalysis } from "../../../api/ai";
import { analyzeRenewalTerms } from "../../../api/contracts";
import { RENEWAL_TERMS_KIND, toRenewalTermsState, type RenewalTermsStateTypes } from "./renewalTerms";

const POLL_MS = 5000;

// 계약 상세의 AI 분석과 같은 쿼리 키 모양(useAiAnalysis·useAiInsights)이라 캐시를 같이 쓴다.
const getRenewalTermsKey = (contractId: string) => ["aiAnalysis", "contract", contractId, RENEWAL_TERMS_KIND] as const;

/**
 * 만료 관리 표의 AI 판단 — 계약마다 자동갱신 조항 분석을 불러오고, "AI로 읽기"로 추출을 시작한다.
 * 읽기를 누른 뒤 분석 행이 생기기 전(계약서 본문 추출 중)에도 "읽는 중"으로 보이도록, 누른 계약은 결과가 올 때까지 다시 확인한다.
 */
export const useRenewalTerms = (contractIds: string[]) => {
  const queryClient = useQueryClient();
  const [requestedIds, setRequestedIds] = useState<ReadonlySet<string>>(() => new Set());

  const queries = useQueries({
    queries: contractIds.map((contractId) => ({
      queryKey: getRenewalTermsKey(contractId),
      queryFn: () => getAiAnalysis("contract", contractId, RENEWAL_TERMS_KIND),
      refetchInterval: (query: { state: { data?: AiAnalysisDto | null } }) => {
        const status = query.state.data?.status;
        if (status === "pending" || status === "running") return POLL_MS;
        return !query.state.data && requestedIds.has(contractId) ? POLL_MS : false;
      },
      // 보조 정보라 실패해도 표는 그대로.
      meta: { errorMode: "silent" as const },
    })),
  });

  const mutation = useMutation({
    mutationFn: analyzeRenewalTerms,
    onSuccess: (_result, contractId) => {
      setRequestedIds((prev) => new Set(prev).add(contractId));
      void queryClient.invalidateQueries({ queryKey: getRenewalTermsKey(contractId) });
    },
    meta: { errorTitle: "AI로 읽기를 시작하지 못했어요" },
  });

  const states: Record<string, RenewalTermsStateTypes> = Object.fromEntries(
    contractIds.map((contractId, i) => [
      contractId,
      toRenewalTermsState(queries[i].data ?? null, requestedIds.has(contractId)),
    ]),
  );

  return {
    states,
    read: (contractId: string) => mutation.mutate(contractId),
    // 지금 읽기 요청을 보내는 중인 계약(버튼 중복 클릭 방지).
    sendingId: mutation.isPending ? (mutation.variables ?? null) : null,
  };
};
