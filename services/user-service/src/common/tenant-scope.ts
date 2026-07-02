import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";

// 조회/수정/삭제 where 절에 합칠 테넌트 필터. admin 은 빈 객체(전 테넌트).
export const tenantScope = (ctx: TenantContext): { tenantId?: string } =>
  ctx.isSystemAdmin ? {} : { tenantId: ctx.tenantId };

// 생성(create) 시 행에 박을 tenantId 를 강제 확정. 일반 사용자는 활성 테넌트.
// admin 이 특정 테넌트 지정 없이 생성하려 하면 거부(어느 테넌트에 만들지 모호).
export const resolveTenantId = (ctx: TenantContext): string => {
  if (ctx.tenantId) return ctx.tenantId;
  throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
};
