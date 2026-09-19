import { useMutation, useQuery } from "@tanstack/react-query";
import { getMyTenants, switchTenant } from "../../../api/tenants";
import { setTokens } from "../../../api/tokens";

export const MY_TENANTS_QUERY_KEY = ["myTenants"] as const;

/**
 * 사이드바 회사 스위처의 상태·전환 로직.
 * 전환 성공 시 새 토큰 저장 직후 동기적으로 전체 새로고침(location.assign) —
 * react-query 캐시·SSE 스트림·화면 상태가 통째로 리셋되어 이전 테넌트 데이터가 남지 않는다.
 */
export const useTenantSwitcher = () => {
  const query = useQuery({
    queryKey: MY_TENANTS_QUERY_KEY,
    queryFn: getMyTenants,
    meta: { errorMode: "silent" },
  });

  const switchMutation = useMutation({
    mutationFn: (tenantId: string) => switchTenant(tenantId),
    onSuccess: (res) => {
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      window.location.assign("/");
    },
    // 실패는 TenantSwitcher 가 인라인(isSwitchError)으로 보여준다.
    meta: { errorMode: "silent" },
  });

  // 파생 값은 렌더 중 계산(useMemo 미사용 — 컨벤션).
  const memberships = query.data ?? [];
  const activeMembership = memberships.find((m) => m.isActive) ?? null;

  return {
    memberships,
    activeMembership,
    isLoading: query.isLoading,
    // 소속을 못 불러온 것과 아직 불러오는 중인 것은 다르다(권한 판정이 둘을 갈라 쓴다).
    // isPending 은 "아직 답을 못 받음" 전부를 뜻한다 — 오프라인처럼 요청이 멈춘 동안에도 참이라,
    // 권한 판정은 isLoading 이 아니라 이 값을 봐야 "권한 없음"으로 잘못 단정하지 않는다.
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
    switchTo: (tenantId: string) => switchMutation.mutate(tenantId),
    // pending 인 동안 클릭된 행에 스피너를 그리기 위한 대상 id.
    switchingTenantId: switchMutation.isPending ? (switchMutation.variables ?? null) : null,
    isSwitchError: switchMutation.isError,
  };
};
