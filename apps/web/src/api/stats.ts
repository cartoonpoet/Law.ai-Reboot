// 업무 통계 API — 단계별 소요시간.
import type { CycleTimeStatsResponse, CycleTimeTargetTypes } from "@lawai/contracts";
import { apiFetch } from "./client";

export interface CycleTimeStatsParams {
  targetType: CycleTimeTargetTypes;
  /** YYYY-MM-DD — 없으면 서버 기본(최근 6개월) */
  from?: string;
  to?: string;
  ownerId?: string;
}

export const getCycleTimeStats = (params: CycleTimeStatsParams): Promise<CycleTimeStatsResponse> => {
  const search = new URLSearchParams({ targetType: params.targetType });
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.ownerId) search.set("ownerId", params.ownerId);
  return apiFetch<CycleTimeStatsResponse>(`/stats/cycle-time?${search.toString()}`);
};
