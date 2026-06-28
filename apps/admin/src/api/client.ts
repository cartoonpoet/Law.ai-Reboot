import { getAccessToken } from "./tokens";

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  if (typeof window !== "undefined" && window.location.hostname) {
    // admin.lawai-reboot.kro.kr → api.lawai-reboot.kro.kr 가 정석이지만 dev 에선 같은 호스트 3000.
    return `http://${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
};

/**
 * admin 전용 apiFetch — Bearer 헤더 자동 첨부, JSON 응답 파싱.
 * 401 시 refresh 자동 시도는 아직 미구현(MVP). 후속에서 web 의 refresh 흐름과 동기화.
 */
export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
};
