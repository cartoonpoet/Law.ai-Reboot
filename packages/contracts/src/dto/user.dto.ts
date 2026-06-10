export interface CreateUserRequest {
  email: string;
  name: string;
  passwordHash: string;
}

export interface FindUserByEmailRequest {
  email: string;
}

export interface FindUserByIdRequest {
  id: string;
}

// user-service 내부 전용: 해시를 포함한 사용자 (gateway로는 절대 노출 금지)
export interface UserWithHash {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface CreateResetTokenRequest {
  userId: string;
  tokenHash: string;
  expiresAt: string; // ISO 8601
}

export interface ConsumeResetTokenRequest {
  tokenHash: string;
}

// 유효한(미사용·미만료) 토큰이면 소유자 id, 아니면 null
export interface ConsumeResetTokenResult {
  userId: string;
}

export interface UpdatePasswordRequest {
  userId: string;
  passwordHash: string;
}
