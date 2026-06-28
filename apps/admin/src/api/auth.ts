import type { LoginRequest } from "@lawai/contracts";
import { apiFetch } from "./client";

// auth-service 의 AuthResult 와 동일 형태(internal interface 라 contracts 에 export 없어 인라인 선언).
export interface AdminLoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    departmentId: string | null;
    departmentName: string | null;
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const login = (req: LoginRequest): Promise<AdminLoginResponse> =>
  apiFetch<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(req),
  });
