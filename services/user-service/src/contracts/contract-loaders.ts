// 서비스들이 공통으로 쓰는 조회 헬퍼(PrismaService 를 받는 함수). 클래스를 늘리지 않으려고 함수로 둔다.
import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
import type { AuthzViewer } from "./contracts.authz";
import { contractInclude, type ContractWithRelations } from "./contract.mapper";

// viewer(role/departmentId) 조회. viewerId 없거나 사용자 미존재면 null(evaluate 안전 기본).
// role 공급원: 활성 테넌트의 UserTenant.role(토큰 stale 방지). admin 은 inHouseCounsel 로 매핑.
export const loadViewer = async (
  prisma: PrismaService,
  viewerId: string | undefined,
  ctx: TenantContext,
): Promise<AuthzViewer | null> => {
  if (!viewerId) return null;
  if (ctx.isSystemAdmin) {
    // 시스템 admin 은 전권 — authz 상 전체 view 동급(inHouseCounsel 역할로 평가).
    const u = await prisma.user.findUnique({ where: { id: viewerId } });
    return u ? { id: u.id, role: "inHouseCounsel", departmentId: u.departmentId } : null;
  }
  const m = await prisma.userTenant.findFirst({
    where: { userId: viewerId, tenantId: ctx.tenantId },
    include: { user: { select: { departmentId: true } } },
  });
  return m ? { id: viewerId, role: m.role, departmentId: m.user.departmentId } : null;
};

// 삭제되지 않은 계약 존재 확인 후 현재 행(관계 포함) 반환(없으면 404).
// 권한 평가(evaluate)에 references/createdById/ownerId 가 필요하므로 contractInclude 로 로드.
// tenantScope 를 where 에 합쳐 타 테넌트 id 위조를 차단한다.
export const ensureContractExists = async (
  prisma: PrismaService,
  id: string,
  ctx: TenantContext,
): Promise<ContractWithRelations> => {
  const row = await prisma.contract.findFirst({
    where: { id, deletedAt: null, ...tenantScope(ctx) },
    include: contractInclude,
  });
  if (!row) {
    throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
  }
  return row;
};
