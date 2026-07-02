import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchPeople } from "../../../api/directory";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/** 결재자 인물 검색 — 키워드(debounce) + useQuery 캐싱. 빈 키워드면 전체 목록(브라우즈). */
export const useApproverSearch = () => {
  const [keyword, setKeyword] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data } = useQuery({
    queryKey: ["approverPeople", keyword],
    queryFn: () => searchPeople(keyword),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  return { people: data ?? [], search };
};
