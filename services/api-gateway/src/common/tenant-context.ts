import type { JwtPayload, TenantContext } from "@lawai/contracts";
import type { Request } from "express";

/**
 * JWT 페이로드에서 TenantContext 를 추출한다.
 *
 * - 시스템 admin(isSystemAdmin=true): tenantId 생략, isSystemAdmin=true.
 * - 일반 사용자: activeTenantId → tenantId, isSystemAdmin=false.
 */
export const extractTenantContext = (req: Request): TenantContext => {
  const user = (req as Request & { user: JwtPayload }).user;
  return { tenantId: user.activeTenantId, isSystemAdmin: user.isSystemAdmin };
};
