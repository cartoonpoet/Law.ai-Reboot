import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  searchStandardForms,
  countByFormCategory,
  STANDARD_FORM_CATEGORIES,
  type StandardForm,
} from "../../../api/standardForms";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/**
 * 표준계약서 양식 보기 모달 로직.
 * 분류 + 키워드(debounce)로 useQuery 검색(조합별 캐시), 선택 양식 1개 추적.
 */
export const useStandardFormsBrowser = () => {
  const [categoryId, setCategoryId] = useState(STANDARD_FORM_CATEGORIES[0]?.id ?? "");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data, isFetching } = useQuery({
    queryKey: ["standardForms", categoryId, keyword],
    queryFn: () => searchStandardForms({ categoryId, query: keyword }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  const results = data ?? [];
  // 선택 양식은 현재 목록에서 우선 찾고, 없으면 첫 항목을 기본 선택으로 본다.
  const selected: StandardForm | undefined =
    results.find((f) => f.id === selectedId) ?? results[0];

  return {
    results,
    isFetching,
    counts: countByFormCategory(),
    categoryId,
    selected,
    search,
    setCategoryId,
    selectForm: setSelectedId,
  };
};
