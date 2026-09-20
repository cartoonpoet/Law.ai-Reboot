import type { TenantRole } from "@lawai/contracts";

/** 표준양식 관리(만들기/고치기/되돌리기)를 할 수 있는 역할 — 사내 법무 업무를 관리하는 사람만. */
const MANAGE_ROLES: TenantRole[] = ["inHouseCounsel"];

/**
 * 표준양식 관리 메뉴·화면을 볼 수 있는가.
 * 시스템 관리자는 전 화면을 보므로 포함하고, 그 밖에는 사내변호사만 본다.
 */
export const canManageDocumentTemplates = (viewer: {
  isSystemAdmin: boolean;
  role: TenantRole | null;
}): boolean => viewer.isSystemAdmin || (viewer.role !== null && MANAGE_ROLES.includes(viewer.role));
