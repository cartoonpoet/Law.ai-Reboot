import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken, getIsSystemAdmin } from "../api/tokens";

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * 인증 + admin role 가드.
 *
 * - accessToken 없으면 /login.
 * - 토큰은 있지만 role !== 'admin' 이면 /login + 안내(쿼리스트링으로 메시지 전달).
 * - 토큰 검증(만료/위조)은 백엔드가 API 호출 시 401 로 처리 → 별도 fetch 안 함(낙관).
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!getIsSystemAdmin()) {
    return <Navigate to="/login?reason=forbidden" replace />;
  }
  return <>{children}</>;
}
