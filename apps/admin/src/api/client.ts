export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  if (typeof window !== "undefined" && window.location.hostname) {
    // admin.lawai-reboot.kro.kr → api.lawai-reboot.kro.kr 가 정석이지만 dev 에선 같은 호스트 3000.
    return `http://${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
};

import {
  AUTH_REFRESH_PATH,
  SESSION_EXPIRED_REDIRECT,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from "./tokens";

const SESSION_EXPIRED_MESSAGE = "세션이 만료되었습니다. 다시 로그인해 주세요";

const doFetch = (path: string, options: RequestInit): Promise<Response> => {
  const token = getAccessToken();
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
};

/**
 * admin 전용 apiFetch — Bearer 헤더 자동 첨부, JSON 응답 파싱.
 * 401 이면 refresh 로 새 토큰을 받아 원요청을 한 번만 다시 보낸다(web 과 같은 흐름).
 * refresh 까지 실패하면 저장된 토큰을 지우고 로그인 화면으로 보낸다.
 */
export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  let res = await doFetch(path, options);

  // refresh 요청 자체는 raw fetch 라 여기 오지 않지만, 방어적으로 제외해 무한루프를 막는다.
  const canRefresh = Boolean(getRefreshToken()) && path !== AUTH_REFRESH_PATH;
  if (res.status === 401 && canRefresh) {
    try {
      await refreshAccessToken();
      res = await doFetch(path, options);
    } catch {
      clearTokens();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = SESSION_EXPIRED_REDIRECT;
      }
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
};
