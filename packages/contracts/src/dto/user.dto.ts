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

// ─── 내 정보 설정 ────────────────────────────────────────────────

// 프로필 사진 허용 형식·크기 — gateway·user-service·web 공용.
export const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

// user-service → gateway 내부용 내 정보 행. gateway 가 avatarKey 를 이미지 주소로 바꿔 MyProfile 로 내보낸다.
export type UserProfileRow = import("../types").PublicUser & {
  emailNotify: boolean;
  avatarKey: string | null;
};

// GET/PATCH /users/me 응답 — 설정 화면·사이드바가 쓰는 내 정보.
export type MyProfile = import("../types").PublicUser & {
  emailNotify: boolean;
  // API 기준 경로(/users/<id>/avatar/<파일>). 사진이 없으면 null.
  avatarUrl: string | null;
};

export interface GetProfileRequest {
  userId: string;
}

// 바꿀 값만 보낸다. 이메일·부서·역할은 여기서 바꾸지 않는다.
export interface UpdateProfileRequest {
  userId: string;
  name?: string;
  emailNotify?: boolean;
}

export interface AvatarUploadTargetRequest {
  userId: string;
  mimeType: string;
  size: number;
}

// gateway 가 받은 이미지를 올릴 R2 단기 PUT 주소와 저장될 키.
export interface AvatarUploadTarget {
  url: string;
  key: string;
}

export interface ConfirmAvatarRequest {
  userId: string;
  key: string;
}

export interface RemoveAvatarRequest {
  userId: string;
}

// 공개 이미지 경로(/users/:userId/avatar/:fileName)를 서버가 받아올 R2 단기 주소로.
export interface AvatarSourceRequest {
  userId: string;
  fileName: string;
}

export interface AvatarSource {
  url: string;
}

// 멤버십 조회(auth-service 가 토큰 발급/전환에 사용).
export interface FindMembershipsRequest {
  userId: string;
}
export interface MembershipRow {
  tenantId: string;
  tenantName: string;
  role: import("../types").TenantRole;
  // 테넌트 상태 — auth-service 가 suspended 로그인/전환 차단에 사용 (Spec 3).
  tenantStatus: import("./tenant.dto").TenantStatus;
}
export interface FindMembershipsResponse {
  isSystemAdmin: boolean;
  memberships: MembershipRow[];
}
