import { AutoComplete } from "@lawkit/ui";
import type { DirectoryEntry } from "../../../api/directory";
import { useSearchQuery } from "../hooks/useSearchQuery";

interface EntityAutoCompleteProps {
  /** React Query 캐시 구분 키 (예: "ccUsers") */
  queryKey: string;
  /** 키워드 → 검색 결과 (mock/실 API 동일 시그니처) */
  fetcher: (query: string) => Promise<DirectoryEntry[]>;
  placeholder: string;
  /** 다중 선택 여부 */
  multiple?: boolean;
  /** 선택된 항목 (단일은 0~1개) */
  value: DirectoryEntry[];
  /** 선택 변경 — 항상 ref 배열로 전달 */
  onChange: (entries: DirectoryEntry[]) => void;
}

/**
 * 검색형 AutoComplete. 키워드로 디렉터리(사용자/부서/프로젝트)를 검색하고,
 * 선택값은 id+name(ref)로 다룬다. 선택된 항목은 검색 결과에서 빠져도 라벨이 유지된다.
 */
export function EntityAutoComplete({ queryKey, fetcher, placeholder, multiple, value, onChange }: EntityAutoCompleteProps) {
  const { results, search } = useSearchQuery(queryKey, fetcher);

  // 선택값 + 최신 검색 결과를 합쳐 옵션/조회맵 구성 (선택값이 먼저라 라벨 유지)
  const byId = new Map<string, DirectoryEntry>();
  [...value, ...results].forEach((entry) => byId.set(entry.id, entry));
  const options = [...byId.values()].map((entry) => ({ value: entry.id, label: entry.name }));

  const handleChange = (selected: string | string[]) => {
    const ids = Array.isArray(selected) ? selected : selected ? [selected] : [];
    onChange(ids.map((id) => byId.get(id)).filter((entry): entry is DirectoryEntry => entry != null));
  };

  return (
    <AutoComplete
      multiple={multiple}
      showSelectedInList={multiple}
      placeholder={placeholder}
      options={options}
      value={multiple ? value.map((entry) => entry.id) : value[0]?.id ?? ""}
      onInputChange={search}
      onChange={handleChange}
      noResultText="검색 결과가 없습니다"
    />
  );
}
