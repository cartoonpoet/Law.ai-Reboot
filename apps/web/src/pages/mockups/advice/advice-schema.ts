import { z } from "zod";

/** 자문분류(내용) — 기존 법무 시스템의 분류 체계를 그대로 옮겼다. */
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

/** 보안여부 — 계약의 보안등급과 같은 3단계. */
export const SECURITY_LEVELS = [
  { value: "topSecret", label: "극비" },
  { value: "confidential", label: "보안" },
  { value: "normal", label: "일반" },
] as const;

/** 자문분류(지역). */
export const ADVICE_REGIONS = [
  { value: "domestic", label: "국내" },
  { value: "overseas", label: "해외" },
  { value: "both", label: "국내외" },
] as const;

/** 국가 — 원본 폼의 드롭다운 4칸을 다중 선택 하나로 합쳤다(사용자 결정). */
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

// 사람·부서·프로젝트 선택값 — 계약 폼과 같은 ref(id+name) 형태.
const entity = z.object({ id: z.string(), name: z.string() });

export const adviceRequestSchema = z.object({
  title: z.string().trim().min(1, "자문명을 입력해 주세요"),
  categories: z.array(z.string()).min(1, "자문분류를 하나 이상 선택해 주세요"),
  security: z.enum(["topSecret", "confidential", "normal"]),
  // null 을 허용하되(기본값이 null) 제출 시에는 필수 — superRefine 으로 검사해 타입은 nullable 로 둔다.
  requester: entity.nullable(),
  ccUsers: z.array(entity),
  ccDepts: z.array(entity),
  ccSecret: z.array(entity),
  owner: entity.nullable(),
  project: entity.nullable(),
  counterparty: z.string(),
  region: z.enum(["domestic", "overseas", "both"]),
  countries: z.array(z.string()).min(1, "국가를 선택해 주세요"),
  background: z.string().trim().min(1, "사안의 배경을 입력해 주세요"),
  question: z.string().trim().min(1, "질의의 요지를 입력해 주세요"),
  etcRequest: z.string(),
  dueDate: z.string().min(1, "자문 회신 기한을 선택해 주세요"),
}).superRefine((form, ctx) => {
  if (form.requester === null) {
    ctx.addIssue({ code: "custom", path: ["requester"], message: "자문요청자를 선택해 주세요" });
  }
});

export type AdviceRequestForm = z.infer<typeof adviceRequestSchema>;

export const adviceRequestDefaults: AdviceRequestForm = {
  title: "",
  categories: [],
  security: "confidential",
  requester: null,
  ccUsers: [],
  ccDepts: [],
  ccSecret: [],
  owner: null,
  project: null,
  counterparty: "",
  region: "domestic",
  countries: ["KR"],
  background: "",
  question: "",
  etcRequest: "",
  dueDate: "",
};
