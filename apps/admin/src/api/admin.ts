import type {
  AdminAuditListRequest,
  AdminAuditListResponse,
  AdminStatsResponse,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const getAdminStats = (): Promise<AdminStatsResponse> =>
  apiFetch<AdminStatsResponse>("/admin/stats");

// 감사 로그 조회 — 준 조건만 쿼리스트링에 담는다(빈 값은 빼서 전체 조회).
export const getAdminAudit = (
  params: AdminAuditListRequest = {},
): Promise<AdminAuditListResponse> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const queryString = query.toString();
  return apiFetch<AdminAuditListResponse>(
    `/admin/audit${queryString ? `?${queryString}` : ""}`,
  );
};
