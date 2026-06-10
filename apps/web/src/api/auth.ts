import type {
  LoginRequest,
  SignupRequest,
  PublicUser,
  AuthTokens,
} from "@lawai/contracts";
import { apiFetch } from "./client";

interface AuthResponse {
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
