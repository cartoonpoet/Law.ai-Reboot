import type { TenantContext } from "./tenant.dto";

export interface ListDepartmentsRequest {
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

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

// 디렉터리 검색(관계자·참조·결재자 선택용). 빈 q 면 전체(상한 limit).
export interface SearchUsersRequest {
  q?: string;
  limit?: number;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리). 동일 테넌트 사용자만 반환.
  tenantContext?: TenantContext;
}

export interface DepartmentDto {
  id: string;
  name: string;
}

// user-service 내부 전용: 해시를 포함한 사용자 (gateway로는 절대 노출 금지)
export interface UserWithHash {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  departmentId: string | null;
  departmentName: string | null;
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

// 멤버십 조회(auth-service 가 토큰 발급/전환에 사용).
export interface FindMembershipsRequest {
  userId: string;
}
export interface MembershipRow {
  tenantId: string;
  tenantName: string;
  role: import("../types").TenantRole;
}
export interface FindMembershipsResponse {
  isSystemAdmin: boolean;
  memberships: MembershipRow[];
}
