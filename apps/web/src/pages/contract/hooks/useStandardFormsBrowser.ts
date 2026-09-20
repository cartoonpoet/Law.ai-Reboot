import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listTemplates } from "../../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import type { TemplateCategoryTypes, TemplateSummaryDto } from "@lawai/contracts";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/** 표준계약서 양식 보기 모달 로직 — 실제 표준양식 템플릿 API. */
export const useStandardFormsBrowser = () => {
  const [categoryId, setCategoryId] = useState(STANDARD_FORM_CATEGORIES[0]?.id ?? "nda");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data, isFetching } = useQuery({
    queryKey: ["standardForms", categoryId, keyword],
    queryFn: () => listTemplates({ categoryId: categoryId as TemplateCategoryTypes, q: keyword || undefined }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  const results = data?.items ?? [];
  const selected: TemplateSummaryDto | undefined = results.find((f) => f.id === selectedId) ?? results[0];

  return {
    results,
    isFetching,
    counts: data?.counts,
    categoryId,
    selected,
    search,
    setCategoryId,
    selectForm: setSelectedId,
  };
};
