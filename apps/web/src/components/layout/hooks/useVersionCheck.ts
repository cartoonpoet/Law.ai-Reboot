import { useQuery } from "@tanstack/react-query";

// 정적 자산 — /version.json 은 빌드 시 vite 플러그인이 dist/ 루트에 쓴다.
// no-store: 브라우저/CDN 캐시를 우회해 항상 최신 buildId 를 받는다.
interface VersionPayload {
  buildId: string;
}

const fetchVersion = async (): Promise<VersionPayload> => {
  const res = await fetch("/version.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`version.json ${res.status}`);
  }
  return res.json() as Promise<VersionPayload>;
};

// 폴링 주기. 사용자 체감 지연(최악 60s) 과 트래픽(60s 마다 작은 JSON 1회) 의 균형.
const POLL_INTERVAL_MS = 60_000;

/**
 * 새 버전 감지 — 부팅 시점의 __BUILD_ID__ 와 런타임 /version.json.buildId 를 비교.
 *
 * - 폴링은 react-query 가 담당(타이머 직접 관리 X → useEffect 0).
 * - 탭 숨김 시 정지(refetchIntervalInBackground:false): 백그라운드 트래픽 절약.
 * - 탭 복귀 시 즉시 1회(refetchOnWindowFocus): "잠깐 자리 비운 사이 배포됐는지" 빠르게 감지.
 * - 네트워크 일시 실패 시 retry 1회 — 다음 폴링에서 자연 회복.
 */
export const useVersionCheck = (): boolean => {
  const { data } = useQuery({
    queryKey: ["build-version"],
    queryFn: fetchVersion,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
  });
  return Boolean(data && data.buildId !== __BUILD_ID__);
};
