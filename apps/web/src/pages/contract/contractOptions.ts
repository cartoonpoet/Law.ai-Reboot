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

/**
 * 계약 분류 더미 트리: 대분류 → 중분류 → 소분류[].
 * 폼의 cascading 드롭다운 옵션 소스(실데이터는 추후 교체).
 */
export const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  "개발/공급": { "소프트웨어": ["SaaS 이용", "라이선스", "구축/SI"], "용역": ["개발용역", "유지보수", "기술지원"] },
  "구매": { "물품": ["사무용품", "IT 장비", "원자재"], "위탁": ["제조위탁", "운영위탁"] },
  "자문": { "법률": ["일반자문", "계약검토", "소송대리"], "세무/회계": ["기장대리", "세무신고"] },
  "기타": { "기타": ["기타"] },
};

export const getMajorOptions = (): SelectOption[] => toOptions(Object.keys(CATEGORY_TREE));
export const getMinorOptions = (major: string): SelectOption[] =>
  toOptions(Object.keys(CATEGORY_TREE[major] ?? {}));
export const getSubOptions = (major: string, minor: string): SelectOption[] =>
  toOptions(CATEGORY_TREE[major]?.[minor] ?? []);
export const DEPT_CHIPS: SelectOption[] = [
  { value: "dev", label: "개발팀" },
  { value: "ops", label: "운영팀" },
  { value: "infra", label: "인프라팀" },
];
export const PROJECT_OPTIONS: SelectOption[] = [
  { value: "p1", label: "차세대 플랫폼 구축" },
  { value: "p2", label: "데이터센터 이전" },
];
