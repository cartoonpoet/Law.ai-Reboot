// admin 전용 토큰 저장소 — web 의 localStorage 키와 분리(서브도메인 분리이므로 도메인 격리되지만
// 키 이름까지 분리해 명시. role 정보도 함께 저장해 RequireAuth 가 fetch 없이 즉시 가드).

const ACCESS_KEY = "adminAccessToken";
const REFRESH_KEY = "adminRefreshToken";
const ROLE_KEY = "adminRole";
const NAME_KEY = "adminName";
const EMAIL_KEY = "adminEmail";

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_KEY);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_KEY);

export const getRole = (): string | null => localStorage.getItem(ROLE_KEY);

export const getName = (): string | null => localStorage.getItem(NAME_KEY);

export const getEmail = (): string | null => localStorage.getItem(EMAIL_KEY);

export const setTokens = (params: {
  accessToken: string;
  refreshToken: string;
  role: string;
  name: string;
  email: string;
}): void => {
  localStorage.setItem(ACCESS_KEY, params.accessToken);
  localStorage.setItem(REFRESH_KEY, params.refreshToken);
  localStorage.setItem(ROLE_KEY, params.role);
  localStorage.setItem(NAME_KEY, params.name);
  localStorage.setItem(EMAIL_KEY, params.email);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
};
