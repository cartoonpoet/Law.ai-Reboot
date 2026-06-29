export interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PasswordResetRequestRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// 이메일 존재 여부를 노출하지 않기 위해 요청/확인 모두 동일한 성공 형태를 반환한다.
export interface PasswordResetResult {
  ok: true;
}

export interface SwitchTenantRequest {
  // gateway 가 JWT sub 주입(누가 전환하는지). controller 에서 채움.
  userId?: string;
  tenantId: string;
}

export interface MyTenantsRequest {
  userId?: string; // gateway 가 JWT sub 주입
}

export interface MyTenantsResponse {
  tenants: import("./tenant.dto").TenantMembership[];
}
