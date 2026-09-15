// 관련문서 분류(계약/자문/송무/법무프로젝트).
// 지금 실제로 저장된 문서는 계약뿐이다 — 자문·송무·법무프로젝트 화면이 생기면 그 검색을 여기에 붙인다.

export type RelatedDocCategory = "contract" | "advice" | "litigation" | "legalProject";

export interface RelatedDoc {
  id: string;
  name: string;
  category: RelatedDocCategory;
  /** 소속/식별 보조정보 (관리번호·상태·상대방 등) */
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

// 실제 문서를 검색할 수 있는 분류인지(아직 화면·저장소가 없는 분류는 "준비 중").
export const isRelatedDocCategoryReady = (category: RelatedDocCategory): boolean => category === "contract";
