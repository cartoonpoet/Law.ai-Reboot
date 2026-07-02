import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../../api/directory";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/** 디렉터리 사용자 검색 — 키워드(debounce) + useQuery 캐싱. 빈 키워드면 전체 목록(브라우즈). */
export const useUserSearch = () => {
  const [keyword, setKeyword] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data } = useQuery({
    queryKey: ["directoryUsers", keyword],
    queryFn: () => searchUsers(keyword),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  return { users: data ?? [], search };
};
