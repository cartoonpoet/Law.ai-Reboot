import type { PublicStatsResponse } from "@lawai/contracts";
import { apiFetch } from "./client";

// 로그인 전 화면용 공개 통계 — 인증 없이 호출된다.
export const getPublicStats = (): Promise<PublicStatsResponse> =>
  apiFetch<PublicStatsResponse>("/public/stats");
