import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTemplates } from "../../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import type { TemplateCategoryTypes, TemplateSummaryDto } from "@lawai/contracts";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/** 표준계약서 양식 보기 모달 로직 — 실제 표준양식 템플릿 API. */
export const useStandardFormsBrowser = () => {
  const [categoryId, setCategoryId] = useState(STANDARD_FORM_CATEGORIES[0]?.id ?? "nda");
  // 입력창에 보이는 값(keyword)과 실제 조회에 쓰는 값(searchedKeyword)을 나눈다 — 입력이 멈춘 뒤에만 조회한다.
  const [keyword, setKeyword] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    setKeyword(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearchedKeyword(text.trim()), DEBOUNCE_MS);
  };

  // 분류를 바꾸면 고른 양식도 같이 비운다 — 이전 분류에서 고른 양식으로 편집기가 열리면 안 된다.
  const changeCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSelectedId(null);
  };

  // 이전 결과를 이어서 보여주지 않는다(keepPreviousData 미사용): 분류·검색어를 바꾸는 동안 남아 있는
  // 이전 목록에서 양식이 자동으로 골라져 엉뚱한 양식으로 작성이 시작되는 것을 막기 위함.
  const query = useQuery({
    queryKey: ["standardForms", categoryId, searchedKeyword],
    queryFn: () => listTemplates({ categoryId: categoryId as TemplateCategoryTypes, q: searchedKeyword || undefined }),
    staleTime: STALE_MS,
  });

  const results = query.data?.items ?? [];
  const selected: TemplateSummaryDto | undefined = results.find((f) => f.id === selectedId) ?? results[0];

  return {
    results,
    // 첫 조회·분류 전환·검색 재조회를 모두 "불러오는 중"으로 본다(이전 결과를 남기지 않으므로 한 가지로 충분).
    isFetching: query.isFetching,
    isError: query.isError,
    retry: query.refetch,
    // 아직 한 번도 못 불러왔으면 undefined — 화면에서 0 대신 "—"로 보여준다.
    counts: query.data?.counts,
    categoryId,
    keyword,
    // 빈 상태 문구를 "검색 결과 없음"과 "분류에 양식 없음"으로 가르는 기준(입력 중인 값이 아니라 실제 조회한 값).
    searchedKeyword,
    selected,
    search,
    changeCategory,
    selectForm: setSelectedId,
  };
};
