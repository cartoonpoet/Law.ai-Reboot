// 관련문서 검색 (계약/자문/송무/법무프로젝트).
// 현재는 mock — 실 엔드포인트(/related-documents)가 생기면 searchRelatedDocs 내부만 교체.

export type RelatedDocCategory = "contract" | "advice" | "litigation" | "legalProject";

export interface RelatedDoc {
  id: string;
  name: string;
  category: RelatedDocCategory;
  /** 소속/식별 보조정보 (계약명·사건번호 등) */
  sub: string;
  /** YYYY-MM-DD */
  date: string;
}

export const RELATED_DOC_CATEGORIES: { value: RelatedDocCategory; label: string }[] = [
  { value: "contract", label: "계약" },
  { value: "advice", label: "자문" },
  { value: "litigation", label: "송무" },
  { value: "legalProject", label: "법무프로젝트" },
];

const CATEGORY_LABEL = Object.fromEntries(
  RELATED_DOC_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<RelatedDocCategory, string>;

export const categoryLabel = (category: RelatedDocCategory): string => CATEGORY_LABEL[category];

const DOCS: RelatedDoc[] = [
  { id: "d1", name: "SW공급계약서_v2", category: "contract", sub: "차세대 플랫폼 구축 · 삼성전자(주)", date: "2026-05-12" },
  { id: "d2", name: "개인정보 위탁처리 계약서", category: "contract", sub: "데이터센터 이전 · 엘지화학(주)", date: "2026-04-28" },
  { id: "d3", name: "유지보수 연장 계약서", category: "contract", sub: "차세대 플랫폼 구축 · (주)테크파트너스", date: "2026-03-19" },
  { id: "d4", name: "하도급 적정성 자문 회신", category: "advice", sub: "자문 2026-031 · 구매팀", date: "2026-04-10" },
  { id: "d5", name: "표준 비밀유지계약 자문 의견서", category: "advice", sub: "자문 2026-027 · 법무팀", date: "2026-03-22" },
  { id: "d6", name: "데이터 국외이전 적법성 자문", category: "advice", sub: "자문 2026-019 · 개발팀", date: "2026-02-08" },
  { id: "d7", name: "물품대금 청구 소장", category: "litigation", sub: "2026가합1287 · 서울중앙지법", date: "2026-02-15" },
  { id: "d8", name: "손해배상 답변서", category: "litigation", sub: "2025가단9981 · 수원지법", date: "2025-12-03" },
  { id: "d9", name: "계약서 표준화 TF 산출물", category: "legalProject", sub: "AI 계약검토 고도화 · 전략기획팀", date: "2026-01-30" },
  { id: "d10", name: "사내 전자계약 도입 검토보고", category: "legalProject", sub: "사내 보안 강화 · 법무팀", date: "2025-11-18" },
];

const SEARCH_DELAY_MS = 120;

export interface RelatedDocQuery {
  query?: string;
  categories?: RelatedDocCategory[];
}

/** 분류별 전체 문서 수 (필터 패널 카운트 표시용) */
export const countByCategory = (): Record<RelatedDocCategory, number> => {
  const counts = { contract: 0, advice: 0, litigation: 0, legalProject: 0 } as Record<RelatedDocCategory, number>;
  DOCS.forEach((doc) => { counts[doc.category] += 1; });
  return counts;
};

/** 선택 분류(있으면) + 키워드(name·sub 부분일치)로 필터. 가짜 지연 포함. */
export const searchRelatedDocs = ({ query = "", categories }: RelatedDocQuery): Promise<RelatedDoc[]> => {
  const q = query.trim().toLowerCase();
  const catSet = categories && categories.length > 0 ? new Set(categories) : null;
  const matched = DOCS.filter((doc) => {
    if (catSet && !catSet.has(doc.category)) return false;
    if (!q) return true;
    return doc.name.toLowerCase().includes(q) || doc.sub.toLowerCase().includes(q);
  });
  return new Promise((resolve) => setTimeout(() => resolve(matched), SEARCH_DELAY_MS));
};
