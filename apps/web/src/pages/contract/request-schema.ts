import { z } from "zod";
import type { Company } from "@lawai/contracts";
import type { DirectoryEntry } from "../../api/directory";
import type { RelatedDoc } from "../../api/relatedDocs";

// 관계자·참조 선택값(사용자/부서/프로젝트) — 라벨 유지를 위해 id+name 보관
export const entityRefSchema = z.object({
  id: z.string(),
  name: z.string(),
}) satisfies z.ZodType<DirectoryEntry>;

// 관련문서 선택값 — 모달에서 고른 문서를 그대로 보관
export const relatedDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["contract", "advice", "litigation", "legalProject"]),
  sub: z.string(),
  date: z.string(),
}) satisfies z.ZodType<RelatedDoc>;

// 결재선 항목 — 기안/결재/합의/참조 + 순서(배열 순서)
export const APPROVER_TYPES = ["draft", "approve", "agree", "refer"] as const;
export const approverSchema = z.object({
  name: z.string(),
  dept: z.string(),
  type: z.enum(APPROVER_TYPES),
});
export type Approver = z.infer<typeof approverSchema>;

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

// 첨부 파일 — 파일명/메타 + R2 업로드 식별자(있으면 미리보기/비교 활성).
// id/mimeType 은 presign/confirm 으로 업로드된 후 채워지고, 메타데이터-only 레거시는 둘 다 null.
// blob 은 신규 작성 흐름 전용 — contractId 가 없어 즉시 업로드 못 하므로 submit 시점까지 보관.
// submit 흐름이 createContract → 각 blob 업로드 → PATCH 로 사용. zod 검증은 unknown 으로 무시.
export const uploadedFileSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  meta: z.string(),
  mimeType: z.string().nullable(),
  blob: z.unknown().optional(),
});

export const contractRequestSchema = z.object({
  // ① 계약 개요
  stage: z.enum(["new", "change"]),
  secure: z.enum(["top", "secure", "normal"]),
  name: z.string().min(1, "계약명을 입력하세요"),
  requester: z.string().min(1, "검토 요청자를 선택하세요"),
  ctype: z.enum(["normal", "std"]),
  party: z.string().min(1, "계약 당사자를 선택하세요"),
  categoryId: z.string().min(1, "계약 분류를 선택하세요"),
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
  // ③ 관계자·참조 (검색형 AutoComplete — id+name ref 보관)
  ccUsers: z.array(entityRefSchema),
  ccDepts: z.array(entityRefSchema),
  ccSecret: z.array(entityRefSchema),
  owner: entityRefSchema.nullable(),
  project: entityRefSchema.nullable(),
  relatedDocs: z.array(relatedDocSchema),
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
  urls: z.array(z.object({ value: z.string() })),
  // 결재선
  approvers: z.array(approverSchema),
});

export type ContractRequestForm = z.infer<typeof contractRequestSchema>;

export const contractRequestDefaults: ContractRequestForm = {
  stage: "new",
  secure: "secure",
  name: "",
  requester: "",
  ctype: "normal",
  party: "",
  categoryId: "",
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
  owner: null,
  project: null,
  relatedDocs: [],
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
  approvers: [{ name: "손준호", dept: "법무팀", type: "draft" }],
};
