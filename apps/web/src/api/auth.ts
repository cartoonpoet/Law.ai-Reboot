import type {
  LoginRequest,
  SignupRequest,
  PublicUser,
  AuthTokens,
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

export function getMe(): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/me");
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
