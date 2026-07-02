import { useQuery } from "@tanstack/react-query";
import type { ContractCategoryDto } from "@lawai/contracts";
import { getContractCategories } from "../../../api/contractCategories";
import type { SelectOption } from "../contractOptions";

// flat 카테고리 트리 + cascade 파생 헬퍼. 파생은 모두 순수 함수(렌더 중 계산, useEffect 미사용).
// 카테고리 노드 → 드롭다운 옵션(value=id, label=name). flat 목록·자식 목록 어디서나 동일 매핑.
const toCategoryOption = (c: ContractCategoryDto): SelectOption => ({
  value: c.id,
  label: c.name,
});

export const useContractCategories = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["contractCategories"],
    queryFn: getContractCategories,
  });
  const categories: ContractCategoryDto[] = data ?? [];

  // 전체 flat 옵션(필터 드롭다운 등 단일 목록용).
  const getFlatOptions = (): SelectOption[] => categories.map(toCategoryOption);

  // 특정 부모의 자식 옵션(루트는 parentId=null).
  const getChildOptions = (parentId: string | null): SelectOption[] =>
    categories.filter((c) => c.parentId === parentId).map(toCategoryOption);

  // categoryId → 루트부터 해당 노드까지 조상 id 경로([대,중,소]). 미존재 시 빈 배열.
  const getPathIds = (categoryId: string): string[] => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const path: string[] = [];
    let cursor = categoryId ? byId.get(categoryId) : undefined;
    while (cursor) {
      path.unshift(cursor.id);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return path;
  };

  // 잎(자식 없음) 여부. 데이터 로딩 중에는 판정 불가로 false(아직 잎이라 단정하지 않음).
  const isLeaf = (nodeId: string): boolean =>
    !isLoading && getChildOptions(nodeId).length === 0;

  return {
    categories,
    isLoading,
    getFlatOptions,
    getChildOptions,
    getPathIds,
    isLeaf,
  };
};
