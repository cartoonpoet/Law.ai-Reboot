// 내 정보 설정 왼쪽 탭 — 주소(/settings/:tab)와 1:1.
export const SETTINGS_TABS = [
  { id: "profile", label: "내 정보", hint: "사진 · 이름 · 이메일 · 부서" },
  { id: "notifications", label: "알림", hint: "이메일 알림" },
  { id: "password", label: "비밀번호", hint: "변경" },
  { id: "companies", label: "소속 회사", hint: "회사별 역할" },
] as const;

export type SettingsTabTypes = (typeof SETTINGS_TABS)[number]["id"];

export const DEFAULT_SETTINGS_TAB: SettingsTabTypes = "profile";

// 주소의 탭 값이 알려진 탭이면 그 탭, 아니면 null(기본 탭으로 돌려보낸다).
export const toSettingsTab = (value: string | undefined): SettingsTabTypes | null =>
  SETTINGS_TABS.find((tab) => tab.id === value)?.id ?? null;
