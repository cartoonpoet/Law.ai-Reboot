import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTemplates } from "../../../api/documentTemplates";
import type { TemplateCategoryTypes } from "@lawai/contracts";

export const TEMPLATE_LIST_QUERY_KEY = ["documentTemplates"] as const;

/** 표준양식 목록 — 분류 탭 + 이름 검색. */
export const useTemplateList = () => {
  const [categoryId, setCategoryId] = useState<TemplateCategoryTypes | "all">("all");
  const [keyword, setKeyword] = useState("");

  const query = useQuery({
    queryKey: [...TEMPLATE_LIST_QUERY_KEY, categoryId, keyword],
    queryFn: () => listTemplates({ categoryId: categoryId === "all" ? undefined : categoryId, q: keyword || undefined }),
  });

  return {
    items: query.data?.items ?? [],
    counts: query.data?.counts,
    isLoading: query.isLoading,
    isError: query.isError,
    categoryId,
    setCategoryId,
    keyword,
    setKeyword,
    refetch: query.refetch,
  };
};
