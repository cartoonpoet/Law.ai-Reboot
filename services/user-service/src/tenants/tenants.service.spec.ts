import { Test } from "@nestjs/testing";
import { TenantsService } from "./tenants.service";
import { PrismaService } from "../prisma/prisma.service";
import { RpcException } from "@nestjs/microservices";

describe("TenantsService", () => {
  let service: TenantsService;
  const prismaMock = {
    user: { findUnique: jest.fn() },
    userTenant: { findMany: jest.fn() },
    tenant: { create: jest.fn() },
    invitation: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(TenantsService);
  });

  it("사용자의 멤버십 목록 + isSystemAdmin 을 반환한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", isSystemAdmin: false });
    prismaMock.userTenant.findMany.mockResolvedValue([
      { tenantId: "t1", role: "inHouseCounsel", tenant: { name: "A사", status: "active" } },
    ]);
    const res = await service.findMemberships({ userId: "u1" });
    expect(res.isSystemAdmin).toBe(false);
    expect(res.memberships).toEqual([
      { tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" },
    ]);
  });

  it("사용자가 없으면 404 RpcException 을 던진다", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.findMemberships({ userId: "not-exist" })).rejects.toBeInstanceOf(RpcException);
  });

  it("멤버십이 없으면 빈 배열을 반환한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", isSystemAdmin: true });
    prismaMock.userTenant.findMany.mockResolvedValue([]);
    const res = await service.findMemberships({ userId: "u2" });
    expect(res.isSystemAdmin).toBe(true);
    expect(res.memberships).toEqual([]);
  });

  it("createTenant 는 Tenant 를 만들고 DTO 로 반환한다", async () => {
    prismaMock.tenant.create.mockResolvedValue({
      id: "t9", name: "D물산", plan: "pro", status: "trial",
      trialEndsAt: new Date("2026-10-10T00:00:00Z"), createdAt: new Date("2026-09-10T00:00:00Z"),
    });
    const res = await service.createTenant({
      name: "D물산", plan: "pro", status: "trial", trialEndsAt: "2026-10-10T00:00:00.000Z",
    });
    expect(prismaMock.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "D물산", plan: "pro", status: "trial" }),
    });
    expect(res).toMatchObject({ id: "t9", name: "D물산", plan: "pro", status: "trial" });
  });

  it("listMembers 는 활성 테넌트의 멤버와 유효 초대를 반환한다", async () => {
    prismaMock.userTenant.findMany.mockResolvedValue([
      {
        role: "contractManager",
        joinedAt: new Date("2026-09-01T00:00:00Z"),
        user: { id: "u1", name: "김담당", email: "lead@d.com" },
      },
    ]);
    prismaMock.invitation.findMany.mockResolvedValue([
      {
        id: "i1", email: "p@d.com", role: "general",
        expiresAt: new Date("2026-09-17T00:00:00Z"), createdAt: new Date("2026-09-10T00:00:00Z"),
      },
    ]);
    const res = await service.listMembers({ tenantContext: { tenantId: "t1", isSystemAdmin: false } });
    expect(res.members).toEqual([
      { userId: "u1", name: "김담당", email: "lead@d.com", role: "contractManager", joinedAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(res.invites[0]).toMatchObject({ id: "i1", email: "p@d.com" });
  });

  it("listMembers 는 tenantContext 없으면 403", async () => {
    await expect(service.listMembers({})).rejects.toBeInstanceOf(RpcException);
  });
});
