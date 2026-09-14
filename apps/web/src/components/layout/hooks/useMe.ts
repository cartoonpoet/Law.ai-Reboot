import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../../api/auth";

export const ME_QUERY_KEY = ["me"] as const;

// 사이드바 foot 의 사용자 표시용. 실패해도 사이드바 나머지는 정상 렌더(호출부에서 null 처리).
export const useMe = () => {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, meta: { errorMode: "silent" } });
  return { me: query.data ?? null };
};
