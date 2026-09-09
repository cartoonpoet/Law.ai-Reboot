import { Test } from "@nestjs/testing";
import { TenantsService } from "./tenants.service";
import { PrismaService } from "../prisma/prisma.service";
import { RpcException } from "@nestjs/microservices";

describe("TenantsService", () => {
  let service: TenantsService;
  const prismaMock = {
    user: { findUnique: jest.fn() },
    userTenant: { findMany: jest.fn() },
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
});
