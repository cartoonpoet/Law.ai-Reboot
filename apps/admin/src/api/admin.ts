import type {
  AdminAuditListResponse,
  AdminStatsResponse,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const getAdminStats = (): Promise<AdminStatsResponse> =>
  apiFetch<AdminStatsResponse>("/admin/stats");

export const getAdminAudit = (
  limit = 20,
): Promise<AdminAuditListResponse> =>
  apiFetch<AdminAuditListResponse>(`/admin/audit?limit=${limit}`);
