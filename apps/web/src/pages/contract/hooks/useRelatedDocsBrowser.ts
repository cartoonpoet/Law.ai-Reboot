import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listContracts } from "../../../api/contracts";
import { RELATED_DOC_CATEGORY_OPTIONS, type RelatedDoc, type RelatedDocCategory } from "../../../api/relatedDocs";
import { toRelatedDoc } from "../toRelatedDoc";

const DEBOUNCE_MS = 250;
const STALE_MS = 60 * 1000;
// 한 번에 보여줄 최대 건수(최근 수정 순). 더 있으면 키워드로 좁힌다.
export const RELATED_DOC_LIMIT = 30;
const ALL_CATEGORIES = RELATED_DOC_CATEGORY_OPTIONS.map((c) => c.value);

/**
 * 관련문서 찾아보기 모달 로직.
 * - 키워드(debounce)로 실제 계약을 검색(계약명·관리번호·상대계약자). 자문·송무·법무프로젝트는 아직 저장소가 없어 결과가 없다.
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

  const isContractIncluded = categories.includes("contract");
  const { data, isFetching } = useQuery({
    queryKey: ["contracts", "relatedDocs", keyword],
    queryFn: () => listContracts({ q: keyword || undefined, pageSize: RELATED_DOC_LIMIT }),
    enabled: isContractIncluded,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
    meta: { errorTitle: "관련문서를 불러오지 못했어요" },
  });

  return {
    results: isContractIncluded ? (data?.items ?? []).map(toRelatedDoc) : [],
    isFetching,
    // 계약은 검색 조건에 맞는 전체 건수, 준비 중인 분류는 null.
    contractTotal: data?.total ?? null,
    categories,
    checked,
    search,
    toggleCategory,
    toggleDoc,
    isChecked,
  };
};
