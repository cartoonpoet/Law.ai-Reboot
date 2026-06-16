import { z } from "zod";
import type { Company } from "@lawai/contracts";
import { CURRENT_USER_ID } from "./contractOptions";

// 선택된 상대 계약자(회사) — 검색/등록 응답을 그대로 보관
export const companyRefSchema = z.object({
  id: z.string(),
  type: z.enum(["company", "individual"]),
  name: z.string(),
  bizNo: z.string(),
  ceo: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  addressDetail: z.string().nullable(),
  managerName: z.string().nullable(),
  managerPhone: z.string().nullable(),
  managerEmail: z.string().nullable(),
  createdAt: z.string(),
}) satisfies z.ZodType<Company>;

export const VAT_OPTIONS = [
  { value: "excluded", label: "부가가치세(10%) 별도" },
  { value: "included", label: "부가가치세(10%) 포함" },
  { value: "none", label: "부가가치세 없음" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "KRW", label: "[KRW] 한국" },
  { value: "USD", label: "[USD] 미국" },
  { value: "JPY", label: "[JPY] 일본" },
  { value: "EUR", label: "[EUR] 유럽" },
] as const;

export const moneyRowSchema = z.object({
  vat: z.enum(["excluded", "included", "none"]),
  amount: z.number().nonnegative().nullable(),
  currency: z.string(),
});

// 첨부 파일 — 파일명 + 메타("DOCX · 1.2MB") 표기용
export const uploadedFileSchema = z.object({
  name: z.string(),
  meta: z.string(),
});

export const contractRequestSchema = z.object({
  // ① 계약 개요
  stage: z.enum(["new", "change"]),
  secure: z.enum(["top", "secure", "normal"]),
  name: z.string().min(1, "계약명을 입력하세요"),
  requester: z.string().min(1, "검토 요청자를 선택하세요"),
  ctype: z.enum(["normal", "std"]),
  party: z.string().min(1, "계약 당사자를 선택하세요"),
  catMajor: z.string().min(1, "계약 대분류를 선택하세요"),
  catMinor: z.string().min(1, "계약 중분류를 선택하세요"),
  catSub: z.string().min(1, "계약 소분류를 선택하세요"),
  periodStart: z.string(),
  periodEnd: z.string(),
  periodText: z.string(),
  periodManual: z.boolean(),
  noEndDate: z.boolean(),
  counterparties: z.array(companyRefSchema).min(1, "상대 계약자를 선택하세요"),
  // ② 계약서·첨부 (mock: 파일명 + 메타 배열)
  contractFiles: z.array(uploadedFileSchema).min(1, "계약서를 첨부하세요"),
  attachFiles: z.array(uploadedFileSchema),
  refFiles: z.array(uploadedFileSchema),
  // ③ 관계자·참조
  ccUsers: z.array(z.string()),
  ccDepts: z.array(z.string()),
  ccSecret: z.array(z.string()),
  owner: z.string(),
  project: z.string(),
  // ④ 상세 조건
  lang: z.enum(["ko", "en", "koen", "etc"]),
  legal: z.enum(["dom", "intl", ""]),
  expectedDate: z.string(),
  negotiation: z.number().min(0).max(100),
  money: z.array(moneyRowSchema).refine((rows) => rows.some((r) => r.amount != null), {
    message: "계약 규모를 입력하세요",
  }),
  moneyNote: z.string(),
  // ⑤ 상세 내용 (rich text HTML)
  payTerms: z.string(),
  purpose: z.string().min(1, "계약의 배경 및 목적을 입력하세요"),
  keyPoints: z.string(),
  concerns: z.string(),
  urls: z.array(z.string()),
  // 결재선
  approvers: z.array(z.object({ name: z.string(), role: z.string() })),
});

export type ContractRequestForm = z.infer<typeof contractRequestSchema>;

export const contractRequestDefaults: ContractRequestForm = {
  stage: "new",
  secure: "secure",
  name: "",
  requester: CURRENT_USER_ID,
  ctype: "normal",
  party: "",
  catMajor: "",
  catMinor: "",
  catSub: "",
  periodStart: "",
  periodEnd: "",
  periodText: "",
  periodManual: false,
  noEndDate: false,
  counterparties: [],
  contractFiles: [],
  attachFiles: [],
  refFiles: [],
  ccUsers: [],
  ccDepts: [],
  ccSecret: [],
  owner: "",
  project: "",
  lang: "ko",
  legal: "",
  expectedDate: "",
  negotiation: 50,
  money: [{ vat: "excluded", amount: null, currency: "KRW" }],
  moneyNote: "",
  payTerms: "",
  purpose: "",
  keyPoints: "",
  concerns: "",
  urls: [],
  approvers: [{ name: "손준호", role: "기안 · 법무팀" }],
};
