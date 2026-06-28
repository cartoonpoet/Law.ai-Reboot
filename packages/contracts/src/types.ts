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

export interface JwtPayload {
  sub: string; // user id
  email: string;
  // 사용자 role — auth-service 가 토큰 발급 시 user.role 을 포함. 가드(AdminRoleGuard 등)가
  // DB 조회 없이 즉시 권한 분기. 역할 변경 후엔 다음 로그인(또는 refresh)부터 반영 — accessToken
  // TTL(15분) 내 stale 가능성 허용. 강한 invalidation 필요하면 별도 cache/blacklist 도입.
  role?: string;
}
