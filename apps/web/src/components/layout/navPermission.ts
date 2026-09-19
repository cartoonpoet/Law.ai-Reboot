import type { TenantRole } from "@lawai/contracts";
import { canSeeCycleTimeStats } from "../../pages/stats/canSeeCycleTimeStats";
import { NAV_SECTIONS, type NavItemTypes } from "./navSections";

/** 메뉴를 보여줄지 정하는 권한들 — 서버가 막는 기준과 같게 유지한다. */
export interface NavPermissionTypes {
  /** 업무 통계 — 없으면 API 가 403 을 준다. */
  canSeeStats: boolean;
}

/**
 * 권한이 있어야 보이는 메뉴. 여기 없는 메뉴는 모두에게 보인다.
 * 키를 실제 메뉴 id 로 좁혀 둔다 — id 를 바꾸면 컴파일이 깨져서, 메뉴가 조용히 전원에게 열리는 일이 없다.
 */
const PERMISSION_BY_ITEM_ID: Partial<Record<NavItemTypes["id"], keyof NavPermissionTypes>> = {
  stats: "canSeeStats",
};

export interface NavSectionTypes {
  label: string;
  items: NavItemTypes[];
}

const isItemVisible = (item: NavItemTypes, permission: NavPermissionTypes): boolean => {
  const required = PERMISSION_BY_ITEM_ID[item.id];
  return required === undefined || permission[required];
};

/** 볼 수 있는 메뉴만 남긴다. 항목이 하나도 없는 그룹은 제목까지 지운다. */
export const getVisibleNavSections = (permission: NavPermissionTypes): NavSectionTypes[] =>
  NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.filter((item) => isItemVisible(item, permission)),
  })).filter((section) => section.items.length > 0);

/** 통합검색(메뉴로 이동)이 쓰는 평평한 목록 — 못 보는 메뉴는 검색에도 안 나온다. */
export const getVisibleNavItems = (permission: NavPermissionTypes): NavItemTypes[] =>
  getVisibleNavSections(permission).flatMap((section) => section.items);

export const getNavPermission = (viewer: {
  isSystemAdmin: boolean;
  role: TenantRole | null;
}): NavPermissionTypes => ({ canSeeStats: canSeeCycleTimeStats(viewer) });
