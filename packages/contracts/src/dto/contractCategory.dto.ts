// categoryLabel(전체 경로 스냅샷) 구분자. 백엔드 join · 프론트 split 이 동일 값을 공유한다.
export const CATEGORY_LABEL_SEPARATOR = " > ";

// 계약 분류(트리). flat 구조(parentId 포함)로 반환해 프론트에서 cascade/역산을 파생한다.
export interface ContractCategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder?: number | null;
}
