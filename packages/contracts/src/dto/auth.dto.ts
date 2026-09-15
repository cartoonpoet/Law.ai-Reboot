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

// 로그인한 사용자의 비밀번호 변경 — 현재 비밀번호 확인 후 교체. 결과는 PasswordResetResult 와 같은 { ok: true }.
export interface ChangePasswordRequest {
  userId: string; // gateway 가 JWT sub 주입
  currentPassword: string;
  newPassword: string;
}

export interface SwitchTenantRequest {
  // gateway 가 JWT sub 주입(누가 전환하는지). controller 에서 채움.
  userId?: string;
  tenantId: string;
}

export interface MyTenantsRequest {
  userId?: string; // gateway 가 JWT sub 주입
  activeTenantId?: string; // gateway 가 JWT activeTenantId 주입(어느 테넌트가 현재 활성인지 표시용)
}

export interface MyTenantsResponse {
  tenants: import("./tenant.dto").TenantMembership[];
}
