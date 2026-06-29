import type { TenantRole } from "../types";

// gateway → user-service RPC 에 주입되는 테넌트 격리 컨텍스트.
export interface TenantContext {
  // 시스템 admin 이면 undefined(전 테넌트). 일반 사용자는 활성 테넌트 id.
  tenantId?: string;
  isSystemAdmin: boolean;
}

export type TenantPlan = "enterprise" | "pro" | "starter";
export type TenantStatus = "active" | "trial" | "suspended";

export interface TenantDto {
  id: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  name: string;
  role: TenantRole;
  isActive: boolean;
}
