// 표준계약서 양식 검색. 현재는 mock — 실 엔드포인트(/standard-forms)가 생기면
// searchStandardForms 내부만 apiFetch로 교체한다(시그니처·반환 타입 동일).

export interface StandardFormCategory {
  id: string;
  label: string;
}

export interface StandardForm {
  id: string;
  categoryId: string;
  name: string;
  version: string;
  desc: string;
  /** YYYY-MM-DD */
  revisedAt: string;
  /** 조항 수 표기 (예: "8개 조항") */
  clauses: string;
}

export const STANDARD_FORM_CATEGORIES: StandardFormCategory[] = [
  { id: "nda", label: "비밀유지(NDA)" },
  { id: "service", label: "용역" },
  { id: "supply", label: "물품공급" },
  { id: "entrust", label: "업무위탁" },
  { id: "license", label: "SW·라이선스" },
  { id: "etc", label: "기타" },
];

const FORMS: StandardForm[] = [
  { id: "nda1", categoryId: "nda", name: "비밀유지계약서(NDA) 표준", version: "v2.1", desc: "일방·상호 비밀유지 의무, 목적 외 사용금지, 반환·파기 조항 포함 기본형.", revisedAt: "2026-03-02", clauses: "8개 조항" },
  { id: "nda2", categoryId: "nda", name: "상호 비밀유지계약서(MNDA)", version: "v1.4", desc: "양 당사자가 상호 정보를 교환하는 협업·검토 단계용.", revisedAt: "2025-11-10", clauses: "9개 조항" },
  { id: "nda3", categoryId: "nda", name: "영문 비밀유지계약서(NDA, EN)", version: "v1.0", desc: "해외 거래처용 영문 표준. 준거법·관할 영문 표기.", revisedAt: "2025-09-21", clauses: "7 clauses" },
  { id: "svc1", categoryId: "service", name: "용역계약서 표준", version: "v3.0", desc: "용역 범위·대가·검수·하자담보 조항 포함 일반 용역형.", revisedAt: "2026-02-18", clauses: "12개 조항" },
  { id: "svc2", categoryId: "service", name: "기술용역(개발) 계약서", version: "v2.2", desc: "SI·개발 용역. 산출물 귀속·지식재산권 조항 강화.", revisedAt: "2026-01-09", clauses: "14개 조항" },
  { id: "sup1", categoryId: "supply", name: "물품공급계약서 표준", version: "v2.2", desc: "물품 사양·납품·검수·대금지급 조항 포함.", revisedAt: "2025-12-15", clauses: "11개 조항" },
  { id: "ent1", categoryId: "entrust", name: "업무위탁계약서 표준", version: "v1.8", desc: "업무 위탁 범위·수탁자 의무·재위탁 제한 포함.", revisedAt: "2025-10-30", clauses: "10개 조항" },
  { id: "lic1", categoryId: "license", name: "SW 라이선스계약서 표준", version: "v2.0", desc: "사용 범위·기간·업데이트·책임 제한 조항 포함.", revisedAt: "2026-01-25", clauses: "13개 조항" },
  { id: "etc1", categoryId: "etc", name: "양해각서(MOU) 표준", version: "v1.2", desc: "구속력 없는 협력 의향 확인용 기본형.", revisedAt: "2025-08-12", clauses: "6개 조항" },
];

const SEARCH_DELAY_MS = 120;

export interface StandardFormQuery {
  categoryId?: string;
  query?: string;
}

/** 분류별 양식 수 (필터 카운트 표시용) */
export const countByFormCategory = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  STANDARD_FORM_CATEGORIES.forEach((c) => { counts[c.id] = 0; });
  FORMS.forEach((f) => { counts[f.categoryId] += 1; });
  return counts;
};

/** 분류(있으면) + 키워드(name 부분일치)로 필터. 가짜 지연 포함. */
export const searchStandardForms = ({ categoryId, query = "" }: StandardFormQuery): Promise<StandardForm[]> => {
  const q = query.trim().toLowerCase();
  const matched = FORMS.filter((f) => {
    if (categoryId && f.categoryId !== categoryId) return false;
    if (!q) return true;
    return f.name.toLowerCase().includes(q);
  });
  return new Promise((resolve) => setTimeout(() => resolve(matched), SEARCH_DELAY_MS));
};
