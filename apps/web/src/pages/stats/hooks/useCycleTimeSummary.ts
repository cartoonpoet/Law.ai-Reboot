import { useQuery } from "@tanstack/react-query";
import { DEFAULT_RANGE_PRESET, getPresetRange } from "../cycleTimeRange";
import { ALL_OWNERS, getOverdueTotal } from "../cycleTimeView";
import { createCycleTimeQuery } from "./cycleTimeQuery";

/**
 * 홈 카드용 요약 — 계약 기준 기본 기간(최근 6개월).
 * 홈의 다른 카드와 겹치지 않게 실패는 조용히 넘긴다(그래서 통계 화면과 캐시를 나눠 쓴다).
 */
export const useCycleTimeSummary = () => {
  const range = getPresetRange(DEFAULT_RANGE_PRESET, new Date());

  const query = useQuery({
    ...createCycleTimeQuery(
      { targetType: "contract", from: range.from, to: range.to, ownerId: ALL_OWNERS },
      "summary",
    ),
    meta: { errorMode: "silent" },
  });

  const stats = query.data ?? null;

  return {
    avgDays: stats?.total.avgDays ?? null,
    targetDays: stats?.total.targetDays ?? null,
    overdueCount: stats === null ? null : getOverdueTotal(stats.stages),
    isLoading: query.isLoading,
  };
};
