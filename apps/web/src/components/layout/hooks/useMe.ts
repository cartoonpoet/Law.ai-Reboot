import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../../api/auth";

export const ME_QUERY_KEY = ["me"] as const;

/**
 * 지금 로그인한 사람.
 * 실패해도 화면 나머지는 정상 렌더한다(호출부에서 null 처리).
 * `me === null` 은 "아직 모름"과 "못 불러옴"을 구분하지 못하므로,
 * 둘을 갈라야 하는 곳(권한 판정 등)은 `isPending`·`isError` 를 본다.
 */
export const useMe = () => {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, meta: { errorMode: "silent" } });
  return { me: query.data ?? null, isPending: query.isPending, isError: query.isError };
};
