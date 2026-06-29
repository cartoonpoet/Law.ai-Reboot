import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import type {
  FindMembershipsRequest,
  FindMembershipsResponse,
} from "@lawai/contracts";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberships(req: FindMembershipsRequest): Promise<FindMembershipsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    const rows = await this.prisma.userTenant.findMany({
      where: { userId: req.userId },
      include: { tenant: { select: { name: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return {
      isSystemAdmin: user.isSystemAdmin,
      memberships: rows.map((r) => ({
        tenantId: r.tenantId,
        tenantName: r.tenant.name,
        role: r.role,
      })),
    };
  }
}
