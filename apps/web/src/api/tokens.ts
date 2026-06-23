import type { AuthTokens } from "@lawai/contracts";
import { getApiBaseUrl } from "./client";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// refresh 엔드포인트 경로 — tokens.ts(호출)와 client.ts(인터셉터 우회 조건)가 공유한다.
// 한쪽만 바뀌면 401 무한루프가 나므로 단일 출처로 둔다.
export const AUTH_REFRESH_PATH = "/auth/refresh";

// 세션 만료 안내 계약 — client.ts(리다이렉트 writer)와 LoginPage.tsx(reader)가 공유한다.
export const SESSION_EXPIRED_PARAM = "expired";
export const SESSION_EXPIRED_VALUE = "1";
export const SESSION_EXPIRED_REDIRECT = `/login?${SESSION_EXPIRED_PARAM}=${SESSION_EXPIRED_VALUE}`;

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// single-flight: 동시 다발 401이 같은 refresh Promise를 공유해 중복 호출을 막는다.
let refreshPromise: Promise<string> | null = null;

/**
 * refreshToken으로 새 access/refresh를 발급받는다.
 * - apiFetch를 우회한 raw fetch로 /auth/refresh를 호출(무한루프 방지).
 * - 진행 중이면 같은 Promise를 공유(single-flight). 이 single-flight 변수는
 *   apiFetch(client.ts) 401 인터셉터와 SSE 재연결(useNotificationStream) 두 경로가
 *   공유한다 — 동시 다발 401에도 refresh fetch는 1회만 나간다.
 * - 성공 시 setTokens로 저장하고 새 accessToken을 resolve.
 * - 실패(401 등) 시 clearTokens 후 throw. 실패 후 refreshPromise는 finally에서
 *   초기화되므로, 직후 재호출은 토큰 부재로 즉시 reject된다(무한 재시도 없음).
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error("리프레시 토큰이 없습니다"));
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}${AUTH_REFRESH_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        throw new Error("세션이 만료되었습니다");
      }
      const tokens = (await res.json()) as AuthTokens;
      setTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
