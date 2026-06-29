export type Role =
  | "general" // 일반(요청자)
  | "contractManager" // 계약담당자
  | "inHouseCounsel" // 사내변호사
  | "outsideCounsel" // 사외변호사
  | "sealManager" // 인감관리자
  | "admin"; // 관리자

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type TenantRole =
  | "general"
  | "contractManager"
  | "inHouseCounsel"
  | "outsideCounsel"
  | "sealManager";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  isSystemAdmin: boolean;
  // 일반 사용자: 현재 활성 테넌트. 시스템 admin 은 생략(전 테넌트 cross).
  activeTenantId?: string;
  // 활성 테넌트에서의 역할(authz 공급원). admin 은 생략.
  activeRole?: TenantRole;
}
