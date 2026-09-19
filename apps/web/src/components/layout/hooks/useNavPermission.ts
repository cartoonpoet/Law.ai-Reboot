import { getNavPermission, type NavPermissionTypes } from "../navPermission";
import { useMe } from "./useMe";
import { useTenantSwitcher } from "./useTenantSwitcher";

/**
 * 지금 로그인한 사람이 볼 수 있는 메뉴 권한.
 * 사이드바·통합검색·업무 통계 화면이 같은 값을 쓴다(캐시를 공유해 추가 조회는 없다).
 */
export const useNavPermission = (): NavPermissionTypes & {
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const me = useMe();
  const tenants = useTenantSwitcher();

  return {
    ...getNavPermission({
      isSystemAdmin: Boolean(me.me?.isSystemAdmin),
      role: tenants.activeMembership?.role ?? null,
    }),
    // 아직 답을 못 받은 동안만 "모름"이다(isPending). 실패는 isError 로 따로 알린다.
    // isLoading(= isPending && isFetching)으로 재면 오프라인처럼 요청이 멈춘 동안 로딩도 실패도 아니게 되어
    // "권한 없음"으로 잘못 단정한다.
    isLoading: me.isPending || tenants.isPending,
    isError: me.isError || tenants.isError,
    retry: () => {
      me.refetch();
      tenants.refetch();
    },
  };
};
