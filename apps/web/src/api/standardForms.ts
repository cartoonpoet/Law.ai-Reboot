// 표준계약서 양식 분류 — 실제 템플릿(표준양식) API(api/documentTemplates.ts)의 categoryId 값과 동일.

export interface StandardFormCategory {
  id: string;
  label: string;
}

export const STANDARD_FORM_CATEGORIES: StandardFormCategory[] = [
  { id: "nda", label: "비밀유지(NDA)" },
  { id: "service", label: "용역" },
  { id: "supply", label: "물품공급" },
  { id: "entrust", label: "업무위탁" },
  { id: "license", label: "SW·라이선스" },
  { id: "etc", label: "기타" },
];
