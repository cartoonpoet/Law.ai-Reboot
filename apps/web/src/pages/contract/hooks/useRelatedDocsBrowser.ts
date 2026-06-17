import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  searchRelatedDocs,
  countByCategory,
  RELATED_DOC_CATEGORIES,
  type RelatedDoc,
  type RelatedDocCategory,
} from "../../../api/relatedDocs";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;
const ALL_CATEGORIES = RELATED_DOC_CATEGORIES.map((c) => c.value);

/**
 * 관련문서 찾아보기 모달 로직.
 * - 키워드(debounce) + 분류 필터로 useQuery 검색(분류·키워드 조합별 캐시)
 * - 체크된 문서를 working set으로 들고 있다가 확정 시 반환(취소 시 폐기)
 */
export const useRelatedDocsBrowser = (initialSelected: RelatedDoc[]) => {
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<RelatedDocCategory[]>(ALL_CATEGORIES);
  const [checked, setChecked] = useState<RelatedDoc[]>(initialSelected);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const toggleCategory = (value: RelatedDocCategory) =>
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );

  const toggleDoc = (doc: RelatedDoc) =>
    setChecked((prev) =>
      prev.some((d) => d.id === doc.id) ? prev.filter((d) => d.id !== doc.id) : [...prev, doc],
    );

  const isChecked = (id: string) => checked.some((d) => d.id === id);

  const { data, isFetching } = useQuery({
    queryKey: ["relatedDocs", keyword, [...categories].sort()],
    queryFn: () => searchRelatedDocs({ query: keyword, categories }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  return {
    results: data ?? [],
    isFetching,
    counts: countByCategory(),
    categories,
    checked,
    search,
    toggleCategory,
    toggleDoc,
    isChecked,
  };
};
