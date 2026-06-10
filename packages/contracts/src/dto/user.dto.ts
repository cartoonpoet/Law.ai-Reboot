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
