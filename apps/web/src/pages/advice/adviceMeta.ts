import type {
  AdviceMessageKindTypes,
  AdviceMessageStateTypes,
  AdviceRegionTypes,
  AdviceStatusTypes,
  SecurityLevel,
} from "@lawai/contracts";

/** 자문분류(내용) — 기존 법무 시스템의 분류 체계. */
export const ADVICE_CATEGORIES = [
  "개인정보",
  "계약해석",
  "공정거래",
  "기업인수/합병",
  "도산/기업회생",
  "세법",
  "소송/중재",
  "인사/노무",
  "지식재산권",
  "계약서양식",
  "기업지배구조",
  "기업법무",
  "해외법무",
  "기타",
] as const;

export const SECURITY_LEVEL_OPTIONS: { value: SecurityLevel; label: string }[] = [
  { value: "top", label: "극비" },
  { value: "secure", label: "보안" },
  { value: "normal", label: "일반" },
];

export const SECURITY_LEVEL_LABEL: Record<SecurityLevel, string> = { top: "극비", secure: "보안", normal: "일반" };

export const REGION_OPTIONS: { value: AdviceRegionTypes; label: string }[] = [
  { value: "domestic", label: "국내" },
  { value: "overseas", label: "해외" },
  { value: "both", label: "국내외" },
];

export const REGION_LABEL: Record<AdviceRegionTypes, string> = { domestic: "국내", overseas: "해외", both: "국내외" };

export const COUNTRY_OPTIONS = [
  { value: "KR", label: "대한민국" },
  { value: "US", label: "미국" },
  { value: "CN", label: "중국" },
  { value: "JP", label: "일본" },
  { value: "VN", label: "베트남" },
  { value: "DE", label: "독일" },
  { value: "GB", label: "영국" },
  { value: "SG", label: "싱가포르" },
  { value: "IN", label: "인도" },
  { value: "ETC", label: "기타" },
];

export const getCountryLabel = (code: string): string =>
  COUNTRY_OPTIONS.find((country) => country.value === code)?.label ?? code;

export const ADVICE_STATUS_LABEL: Record<AdviceStatusTypes, string> = {
  requestApproval: "요청 결재 중",
  requestRejected: "요청 반려",
  received: "접수",
  reviewing: "검토 중",
  waitingRequester: "답변 대기",
  answerApproval: "회신 결재 중",
  answered: "회신 완료",
  closed: "종결",
};

export const ADVICE_STATUS_COLOR: Record<
  AdviceStatusTypes,
  "secondary" | "primary" | "warning" | "success" | "info" | "danger"
> = {
  requestApproval: "warning",
  requestRejected: "danger",
  received: "secondary",
  reviewing: "primary",
  waitingRequester: "warning",
  answerApproval: "warning",
  answered: "success",
  closed: "info",
};

export const MESSAGE_KIND_LABEL: Record<AdviceMessageKindTypes, string> = {
  followup: "추가 질의",
  reply: "답변",
  answer: "회신",
};

// 공개되지 않은 회신 옆에 붙는 표시(법무팀·담당자에게만 보인다).
export const MESSAGE_STATE_LABEL: Record<Exclude<AdviceMessageStateTypes, "published">, string> = {
  pendingApproval: "결재 중",
  rejected: "결재 반려",
};

export type AdviceGroupTypes = "all" | "received" | "reviewing" | "answered" | "closed";

/** 목록 그룹(1단) → 세부 상태(2단). 계약 목록의 statusGroups 와 같은 방식. */
export const ADVICE_GROUPS: { value: AdviceGroupTypes; label: string; statuses: AdviceStatusTypes[] }[] = [
  { value: "all", label: "전체", statuses: [] },
  { value: "received", label: "접수", statuses: ["requestApproval", "requestRejected", "received"] },
  { value: "reviewing", label: "검토", statuses: ["reviewing", "waitingRequester", "answerApproval"] },
  { value: "answered", label: "회신", statuses: ["answered"] },
  { value: "closed", label: "종결", statuses: ["closed"] },
];

export const getGroupStatuses = (group: AdviceGroupTypes): AdviceStatusTypes[] =>
  ADVICE_GROUPS.find((item) => item.value === group)?.statuses ?? [];
