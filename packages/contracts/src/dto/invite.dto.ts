import type { TenantRole } from "../types";
import type { TenantDto, TenantPlan, TenantStatus } from "./tenant.dto";
import type { PublicUser } from "../types";
import type { AuthTokens } from "../types";

// ─── Spec 4: 고객사 온보딩 (초대) ────────────────────────────────────

// 1단계 — admin 회사 생성 + 첫 담당자 초대
export interface AdminCreateTenantRequest {
  actorId?: string; // gateway 가 JWT sub 주입
  name: string;
  plan: TenantPlan;
  status: Extract<TenantStatus, "active" | "trial">;
  trialEndsAt?: string | null; // status=trial 일 때
  managerEmail: string; // 첫 담당자(contractManager 로 초대)
}
export interface AdminCreateTenantResponse {
  tenant: TenantDto;
  invited: true;
}

// 2단계 — 멤버/초대 목록
export interface TenantMemberRow {
  userId: string;
  name: string;
  // 프로필 사진(API 기준 경로). 없으면 null.
  avatarUrl: string | null;
  email: string;
  role: TenantRole;
  joinedAt: string;
}
export interface TenantInviteRow {
  id: string;
  email: string;
  role: TenantRole;
  expiresAt: string;
  createdAt: string;
}
export interface ListTenantMembersResponse {
  members: TenantMemberRow[];
  invites: TenantInviteRow[]; // 유효(미수락·미취소·미만료) 초대만
}

// 2단계 — 초대 발송(다건, 단일 역할)
export interface InviteMembersRequest {
  // gateway 가 JWT 에서 주입
  tenantId?: string;
  invitedById?: string;
  inviterRole?: TenantRole;
  isSystemAdmin?: boolean;
  emails: string[];
  role: TenantRole;
}
export interface InviteMembersResponse {
  sent: number;
  skipped: string[]; // 이미 멤버이거나 유효 초대가 있는 이메일
}

export interface ResendInviteRequest {
  inviteId: string;
  // gateway 주입
  tenantId?: string;
  invitedById?: string;
  inviterRole?: TenantRole;
  isSystemAdmin?: boolean;
}

export interface CancelInvitationRequest {
  inviteId: string;
  tenantContext?: import("./tenant.dto").TenantContext;
  inviterRole?: TenantRole;
}

// 3단계 — 초대 조회·수락 (public)
export interface InviteInfoResponse {
  tenantName: string;
  email: string;
  role: TenantRole;
}
export interface AcceptInviteRequest {
  token: string;
  name: string;
  password: string;
}
export interface AcceptInviteResponse {
  existingUser: boolean;
  // 신규 가입일 때만 — 자동 로그인용
  user?: PublicUser;
  tokens?: AuthTokens;
}

// ─── user-service RPC 내부 계약 ─────────────────────────────────────

export interface CreateTenantRpcRequest {
  name: string;
  plan: TenantPlan;
  status: Extract<TenantStatus, "active" | "trial">;
  trialEndsAt?: string | null;
}

export interface CreateInvitationRequest {
  tenantId: string;
  email: string;
  role: TenantRole;
  tokenHash: string;
  invitedById: string;
  expiresAt: string;
}
// null 이면 스킵됨(이미 멤버 또는 유효 초대 존재)
export interface CreateInvitationResult {
  created: boolean;
}

export interface RotateInvitationRequest {
  inviteId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: string;
}
// 재발송 메일에 필요한 정보
export interface RotateInvitationResult {
  email: string;
  tenantName: string;
}

export interface FindInvitationRequest {
  tokenHash: string;
}
export interface FindInvitationResult {
  tenantId: string;
  tenantName: string;
  email: string;
  role: TenantRole;
}

export interface AcceptInvitationRpcRequest {
  tokenHash: string;
  name: string;
  passwordHash: string;
}
export interface AcceptInvitationRpcResult {
  tenantId: string;
  existingUser: boolean;
  userId: string;
}

export interface ListTenantMembersRequest {
  tenantContext?: import("./tenant.dto").TenantContext;
}
