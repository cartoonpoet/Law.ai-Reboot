import type {
  LoginRequest,
  SignupRequest,
  PublicUser,
  AuthTokens,
  MyProfile,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export function login(req: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function signup(req: SignupRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// 내 정보(이메일 알림·프로필 사진 포함) — 사이드바·설정 화면 공용.
export function getMe(): Promise<MyProfile> {
  return apiFetch<MyProfile>("/users/me");
}

// 로그인한 사용자의 비밀번호 변경 — 현재 비밀번호가 맞아야 한다.
export function changePassword(req: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/password/change", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface OtpRequestPayload {
  phone: string;
}

export function requestOtp(req: OtpRequestPayload): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface OtpVerifyPayload {
  phone: string;
  code: string;
}

export function verifyOtp(req: OtpVerifyPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface PasswordResetRequestPayload {
  email: string;
}

export function requestPasswordReset(
  req: PasswordResetRequestPayload,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/password/reset-request", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface PasswordResetConfirmPayload {
  token: string;
  newPassword: string;
}

export function confirmPasswordReset(
  req: PasswordResetConfirmPayload,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/password/reset-confirm", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─── 온보딩 초대 수락 (Spec 4) ────────────────────────────────────────

export function getInviteInfo(
  token: string,
): Promise<import("@lawai/contracts").InviteInfoResponse> {
  return apiFetch<import("@lawai/contracts").InviteInfoResponse>(
    `/auth/invites/${token}`,
  );
}

export function acceptInvite(
  req: import("@lawai/contracts").AcceptInviteRequest,
): Promise<import("@lawai/contracts").AcceptInviteResponse> {
  return apiFetch<import("@lawai/contracts").AcceptInviteResponse>(
    "/auth/invites/accept",
    { method: "POST", body: JSON.stringify(req) },
  );
}
