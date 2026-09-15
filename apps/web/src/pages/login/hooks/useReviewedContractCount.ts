import { useQuery } from "@tanstack/react-query";
import { getPublicStats } from "../../../api/publicStats";

// "실시간" 표시에 맞춰 1분마다 다시 받는다(서버도 1분 캐시).
const REFRESH_MS = 60_000;

/**
 * 로그인 화면의 "지금까지 검토된 계약" 실제 숫자. 불러오기 전·실패하면 null —
 * 가짜 숫자를 보여주지 않도록 화면이 줄 자체를 숨긴다.
 */
export const useReviewedContractCount = () => {
  const query = useQuery({
    queryKey: ["public-stats"],
    queryFn: getPublicStats,
    refetchInterval: REFRESH_MS,
    // 로그인 전 화면 장식 정보 — 실패해도 알리지 않는다.
    meta: { errorMode: "silent" },
  });
  return query.data?.reviewedContractCount ?? null;
};
