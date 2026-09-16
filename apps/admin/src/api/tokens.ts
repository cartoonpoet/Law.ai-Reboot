// admin 전용 토큰 저장소 — web 의 localStorage 키와 분리(서브도메인 분리이므로 도메인 격리되지만
// 키 이름까지 분리해 명시. role 정보도 함께 저장해 RequireAuth 가 fetch 없이 즉시 가드).

import type { AuthTokens } from "@lawai/contracts";
import { getApiBaseUrl } from "./client";

const ACCESS_KEY = "adminAccessToken";
const REFRESH_KEY = "adminRefreshToken";
const IS_SYSTEM_ADMIN_KEY = "adminIsSystemAdmin";
const NAME_KEY = "adminName";
const EMAIL_KEY = "adminEmail";

// refresh 엔드포인트 경로 — tokens.ts(호출)와 client.ts(인터셉터 우회 조건)가 공유한다.
// 한쪽만 바뀌면 401 무한루프가 나므로 단일 출처로 둔다.
export const AUTH_REFRESH_PATH = "/auth/refresh";

// 세션 만료 안내 계약 — client.ts(리다이렉트) 와 LoginPage(문구 표시) 가 공유한다.
export const SESSION_EXPIRED_PARAM = "expired";
export const SESSION_EXPIRED_VALUE = "1";
export const SESSION_EXPIRED_REDIRECT = `/login?${SESSION_EXPIRED_PARAM}=${SESSION_EXPIRED_VALUE}`;

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_KEY);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_KEY);

export const getIsSystemAdmin = (): boolean =>
  localStorage.getItem(IS_SYSTEM_ADMIN_KEY) === "true";

export const getName = (): string | null => localStorage.getItem(NAME_KEY);

export const getEmail = (): string | null => localStorage.getItem(EMAIL_KEY);

export const setTokens = (params: {
  accessToken: string;
  refreshToken: string;
  isSystemAdmin: boolean;
  name: string;
  email: string;
}): void => {
  localStorage.setItem(ACCESS_KEY, params.accessToken);
  localStorage.setItem(REFRESH_KEY, params.refreshToken);
  localStorage.setItem(IS_SYSTEM_ADMIN_KEY, params.isSystemAdmin ? "true" : "false");
  localStorage.setItem(NAME_KEY, params.name);
  localStorage.setItem(EMAIL_KEY, params.email);
};

/** 갱신받은 토큰만 교체 — 이름·이메일·권한은 로그인 때 저장한 값을 그대로 둔다. */
export const setSessionTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(IS_SYSTEM_ADMIN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
};

// single-flight: 동시에 여러 요청이 401 을 받아도 refresh 는 한 번만 나간다.
let refreshPromise: Promise<string> | null = null;

/**
 * refreshToken 으로 새 access/refresh 를 발급받는다(web 과 같은 흐름).
 * - apiFetch 를 거치지 않는 raw fetch 로 호출한다(401 인터셉터 무한루프 방지).
 * - 진행 중이면 같은 Promise 를 공유한다.
 * - 실패하면 저장된 토큰을 지우고 throw. finally 에서 초기화하므로 다음 호출은
 *   토큰 부재로 즉시 실패한다(무한 재시도 없음).
 */
export const refreshAccessToken = (): Promise<string> => {
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
      setSessionTokens(tokens);
      return tokens.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
