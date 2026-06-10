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
