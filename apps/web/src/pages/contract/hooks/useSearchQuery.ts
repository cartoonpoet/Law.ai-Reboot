import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const DEBOUNCE_MS = 300;
const STALE_MS = 5 * 60 * 1000;

/**
 * 키워드 검색 + React Query 캐싱 공용 훅.
 *
 * - 입력은 debounce(setTimeout) 후 keyword 상태로 반영 — 키 입력마다 호출 방지
 * - `queryKey: [key, keyword]` 로 **키워드별 결과 캐시** → 같은 키워드 재검색 시 서버 재요청 없음(부하 대비)
 * - `placeholderData: keepPreviousData` 로 다음 검색 로딩 중 이전 결과 유지(깜빡임 방지)
 *
 * fetcher는 실 API와 동일 시그니처라, mock → 실 엔드포인트 교체 시 이 훅은 그대로 둔다.
 */
export const useSearchQuery = <T>(key: string, fetcher: (query: string) => Promise<T[]>) => {
  const [keyword, setKeyword] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data, isFetching } = useQuery({
    queryKey: [key, keyword],
    queryFn: () => fetcher(keyword),
    enabled: keyword.length > 0,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  return { results: data ?? [], isFetching, search };
};
