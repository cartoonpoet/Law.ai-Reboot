import type { TenantRole } from "@lawai/contracts";

/** 업무 통계(메뉴·홈 카드·화면)를 볼 수 있는 역할 — 법무 업무를 관리하는 사람만. */
const STATS_ROLES: TenantRole[] = ["inHouseCounsel"];

/**
 * 업무 통계(소요시간)를 볼 수 있는가.
 * 시스템 관리자는 전 화면을 보므로 포함하고, 그 밖에는 사내변호사만 본다.
 */
export const canSeeCycleTimeStats = (viewer: {
  isSystemAdmin: boolean;
  role: TenantRole | null;
}): boolean => viewer.isSystemAdmin || (viewer.role !== null && STATS_ROLES.includes(viewer.role));
