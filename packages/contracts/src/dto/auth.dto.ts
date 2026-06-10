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
