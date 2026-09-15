import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateTenantRpcRequest,
  FindMembershipsRequest,
  FindMembershipsResponse,
  ListTenantMembersRequest,
  ListTenantMembersResponse,
  TenantDto,
} from "@lawai/contracts";
import { toAvatarPath } from "@lawai/contracts";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberships(req: FindMembershipsRequest): Promise<FindMembershipsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    const rows = await this.prisma.userTenant.findMany({
      where: { userId: req.userId },
      include: { tenant: { select: { name: true, status: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return {
      isSystemAdmin: user.isSystemAdmin,
      memberships: rows.map((r) => ({
        tenantId: r.tenantId,
        tenantName: r.tenant.name,
        role: r.role,
        tenantStatus: r.tenant.status,
      })),
    };
  }

  /** 회사 생성 (Spec 4, admin 온보딩 1단계). */
  async createTenant(req: CreateTenantRpcRequest): Promise<TenantDto> {
    const t = await this.prisma.tenant.create({
      data: {
        name: req.name,
        plan: req.plan,
        status: req.status,
        trialEndsAt: req.trialEndsAt ? new Date(req.trialEndsAt) : null,
      },
    });
    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    };
  }

  /** 활성 테넌트의 멤버 + 유효 초대 목록 (Spec 4, 멤버 관리 화면). */
  async listMembers(req: ListTenantMembersRequest): Promise<ListTenantMembersResponse> {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      throw new RpcException({ status: 403, message: "활성 회사가 없습니다" });
    }
    const [rows, invites] = await Promise.all([
      this.prisma.userTenant.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, name: true, email: true, avatarKey: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.invitation.findMany({
        where: {
          tenantId,
          acceptedAt: null,
          canceledAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      members: rows.map((r) => ({
        userId: r.user.id,
        name: r.user.name,
        avatarUrl: toAvatarPath(r.user.id, r.user.avatarKey),
        email: r.user.email,
        role: r.role,
        joinedAt: r.joinedAt.toISOString(),
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }
}
