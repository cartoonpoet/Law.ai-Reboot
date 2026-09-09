import type { AuthTokens, PublicUser, TenantMembership } from "@lawai/contracts";
import { apiFetch } from "./client";

// GET /auth/me/tenants 는 { tenants: [...] } 로 래핑되어 온다(contracts MyTenantsResponse).
interface MyTenantsApiResponse {
  tenants: TenantMembership[];
}

// POST /auth/switch-tenant 는 login 과 동일한 형태(user + 새 토큰)를 반환한다.
export interface SwitchTenantResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export const getMyTenants = (): Promise<TenantMembership[]> =>
  apiFetch<MyTenantsApiResponse>("/auth/me/tenants").then((res) => res.tenants);

export const switchTenant = (tenantId: string): Promise<SwitchTenantResponse> =>
  apiFetch<SwitchTenantResponse>("/auth/switch-tenant", {
    method: "POST",
    body: JSON.stringify({ tenantId }),
  });
