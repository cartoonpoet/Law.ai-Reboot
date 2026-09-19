import { getNavPermission, type NavPermissionTypes } from "../navPermission";
import { useMe } from "./useMe";
import { useTenantSwitcher } from "./useTenantSwitcher";

/**
 * 지금 로그인한 사람이 볼 수 있는 메뉴 권한.
 * 사이드바·통합검색·업무 통계 화면이 같은 값을 쓴다(캐시를 공유해 추가 조회는 없다).
 */
export const useNavPermission = (): NavPermissionTypes & { isLoading: boolean; isError: boolean } => {
  const me = useMe();
  const tenants = useTenantSwitcher();

  return {
    ...getNavPermission({
      isSystemAdmin: Boolean(me.me?.isSystemAdmin),
      role: tenants.activeMembership?.role ?? null,
    }),
    // 아직 불러오는 중일 때만 "모름"이다. 조회가 실패한 경우를 로딩으로 두면
    // 화면이 영원히 스켈레톤에 갇힌다(실패는 isError 로 알린다).
    isLoading: me.isPending || tenants.isLoading,
    isError: me.isError || tenants.isError,
  };
};
