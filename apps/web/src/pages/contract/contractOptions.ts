/** select/dropdown 옵션 중앙 관리 */
export interface SelectOption { value: string; label: string; }

export const toOptions = (items: string[]): SelectOption[] => items.map((o) => ({ value: o, label: o }));

export const USER_OPTIONS: SelectOption[] = [
  { value: "jhson1", label: "손준호 (팀(개발) | jhson1)" },
  { value: "lee", label: "이법무 (법무팀)" },
  { value: "kim", label: "김검토 (법무팀)" },
  { value: "park", label: "박담당 (구매팀)" },
];

/** 현재 로그인 사용자(목업) — 검토 요청자 기본값 등에 사용 */
export const CURRENT_USER_ID = "jhson1";

export const CAT_MINOR_OPTIONS: SelectOption[] = toOptions(["소프트웨어", "용역", "물품", "기타"]);
export const DEPT_CHIPS: SelectOption[] = [
  { value: "dev", label: "개발팀" },
  { value: "ops", label: "운영팀" },
  { value: "infra", label: "인프라팀" },
];
export const PROJECT_OPTIONS: SelectOption[] = [
  { value: "p1", label: "차세대 플랫폼 구축" },
  { value: "p2", label: "데이터센터 이전" },
];
