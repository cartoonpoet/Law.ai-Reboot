import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardBrief } from "../../../api/assistant";

export const DASHBOARD_BRIEF_QUERY_KEY = ["dashboard", "aiBrief"] as const;

// 서버도 30분 캐시하지만, 화면 전환마다 요청하지 않게 브라우저에서도 10분은 그대로 쓴다.
const STALE_MS = 10 * 60 * 1000;

/** 대시보드 AI 브리핑 — 조회 + "다시 정리"(서버 캐시 무시). 실패는 카드 안에서 안내한다. */
export const useDashboardBrief = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: DASHBOARD_BRIEF_QUERY_KEY,
    queryFn: () => getDashboardBrief(false),
    staleTime: STALE_MS,
    retry: false,
    meta: { errorMode: "silent" },
  });

  const refreshMutation = useMutation({
    mutationFn: () => getDashboardBrief(true),
    onSuccess: (data) => queryClient.setQueryData(DASHBOARD_BRIEF_QUERY_KEY, data),
    meta: { errorMode: "silent" },
  });

  return {
    brief: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: refreshMutation.isPending,
    isError: (query.isError && !query.data) || refreshMutation.isError,
    refresh: () => refreshMutation.mutate(),
  };
};
