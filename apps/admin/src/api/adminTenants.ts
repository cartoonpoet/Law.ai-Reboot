import type {
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantListResponse,
  AdminTenantUpdateRequest,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const listAdminTenants = (): Promise<AdminTenantListResponse> =>
  apiFetch<AdminTenantListResponse>("/admin/tenants");

export const getAdminTenant = (id: string): Promise<AdminTenantDetailResponse> =>
  apiFetch<AdminTenantDetailResponse>(`/admin/tenants/${id}`);

export const updateAdminTenant = (
  id: string,
  body: Pick<AdminTenantUpdateRequest, "plan" | "status" | "trialEndsAt">,
): Promise<AdminTenantListItem> =>
  apiFetch<AdminTenantListItem>(`/admin/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const createAdminTenant = (
  body: Pick<
    import("@lawai/contracts").AdminCreateTenantRequest,
    "name" | "plan" | "status" | "trialEndsAt" | "managerEmail"
  >,
): Promise<import("@lawai/contracts").AdminCreateTenantResponse> =>
  apiFetch<import("@lawai/contracts").AdminCreateTenantResponse>("/admin/tenants", {
    method: "POST",
    body: JSON.stringify(body),
  });
