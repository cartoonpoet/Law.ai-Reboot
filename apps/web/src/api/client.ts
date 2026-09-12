export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
}

import {
  getAccessToken,
  getRefreshToken,
  clearTokens,
  refreshAccessToken,
  AUTH_REFRESH_PATH,
  SESSION_EXPIRED_REDIRECT,
} from "./tokens";

function doFetch(path: string, options: RequestInit): Promise<Response> {
  const token = getAccessToken();
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res = await doFetch(path, options);

  // 401 인터셉터: 토큰 만료 시 자동 refresh 후 원요청 1회 재시도.
  const isUnauthorized = res.status === 401;
  // refresh 가능 조건: refresh 토큰이 있고, refresh 요청 자체가 아닐 것
  // (refresh 요청은 raw fetch라 여기 안 거치지만 방어적으로 제외 — 무한루프 차단).
  const canRefresh = !!getRefreshToken() && path !== AUTH_REFRESH_PATH;
  if (isUnauthorized && canRefresh) {
    try {
      await refreshAccessToken();
      res = await doFetch(path, options); // 새 accessToken으로 1회만 재시도
    } catch {
      // refresh 실패 → 세션 정리 후 로그인으로(이미 /login이면 리다이렉트 생략).
      clearTokens();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = SESSION_EXPIRED_REDIRECT;
      }
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요");
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// apiFetch<T>와 동일한 인증/401-refresh 처리를 거치되, 응답 바디를 파싱하지 않는다.
// 성공 시 빈 바디(204/void 응답)를 돌려주는 엔드포인트용 — apiFetch로 호출하면
// res.json()이 빈 바디에서 파싱 에러를 던진다.
export async function apiFetchVoid(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  let res = await doFetch(path, options);

  const isUnauthorized = res.status === 401;
  const canRefresh = !!getRefreshToken() && path !== AUTH_REFRESH_PATH;
  if (isUnauthorized && canRefresh) {
    try {
      await refreshAccessToken();
      res = await doFetch(path, options);
    } catch {
      clearTokens();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = SESSION_EXPIRED_REDIRECT;
      }
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요");
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
}
