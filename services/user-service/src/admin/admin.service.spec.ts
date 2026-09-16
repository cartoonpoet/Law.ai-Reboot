import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AdminService — tenants (Spec 3)", () => {
  let service: AdminService;
  const prismaMock = {
    tenant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    userTenant: { groupBy: jest.fn(), count: jest.fn() },
    contract: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    auditLog: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    user: { count: jest.fn(), findMany: jest.fn() },
    file: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  const t1 = {
    id: "t1", name: "A상사", plan: "enterprise", status: "active",
    trialEndsAt: null, createdAt: new Date("2026-07-03T00:00:00Z"),
  };
  const t2 = {
    id: "t2", name: "C엔터", plan: "starter", status: "trial",
    trialEndsAt: new Date("2026-09-22T00:00:00Z"), createdAt: new Date("2026-09-01T00:00:00Z"),
  };

  it("listTenants 는 회사별 멤버/계약/최근활동을 머지하고 totals 를 채운다", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([t1, t2]);
    prismaMock.userTenant.groupBy.mockResolvedValue([
      { tenantId: "t1", _count: { _all: 28 } },
      { tenantId: "t2", _count: { _all: 5 } },
    ]);
    prismaMock.contract.groupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 201 } }]);
    prismaMock.auditLog.groupBy.mockResolvedValue([
      { tenantId: "t1", _max: { at: new Date("2026-09-10T05:00:00Z") } },
    ]);
    prismaMock.user.count.mockResolvedValue(33);
    prismaMock.contract.count.mockResolvedValue(201);

    const res = await service.listTenants();

    expect(res.tenants).toHaveLength(2);
    const a = res.tenants.find((x) => x.id === "t1")!;
    expect(a).toMatchObject({
      memberCount: 28,
      contractCount: 201,
      lastActivityAt: "2026-09-10T05:00:00.000Z",
      trialEndsAt: null,
    });
    const c = res.tenants.find((x) => x.id === "t2")!;
    expect(c).toMatchObject({
      memberCount: 5,
      contractCount: 0,
      lastActivityAt: null,
      trialEndsAt: "2026-09-22T00:00:00.000Z",
    });
    expect(res.totals).toEqual({ tenants: 2, users: 33, contracts: 201, trials: 1 });
  });

  it("getTenant 은 진행중/체결 분류·역할 구성·최근 활동을 반환한다", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(t1);
    prismaMock.userTenant.count.mockResolvedValue(28);
    prismaMock.contract.count
      .mockResolvedValueOnce(42)
      .mockResolvedValueOnce(159);
    prismaMock.file.aggregate.mockResolvedValue({ _sum: { size: 1800000 } });
    prismaMock.userTenant.groupBy.mockResolvedValue([
      { role: "general", _count: { _all: 18 } },
      { role: "inHouseCounsel", _count: { _all: 3 } },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([
      { id: "a1", action: "update", actorId: "u1", targetType: "Contract", targetId: "c1", tenantId: "t1", detail: null, at: new Date("2026-09-10T05:00:00Z") },
    ]);
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "김지원" }]);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: "t1", name: "A상사" }]);
    prismaMock.contract.findMany.mockResolvedValue([{ id: "c1", title: "공급계약" }]);

    const res = await service.getTenant("t1");

    expect(res.stats).toEqual({
      memberCount: 28, activeContracts: 42, signedContracts: 159, storageBytes: 1800000,
    });
    expect(res.roleBreakdown).toEqual([
      { role: "general", count: 18 },
      { role: "inHouseCounsel", count: 3 },
    ]);
    expect(res.recentAudit[0]).toMatchObject({ id: "a1", actorName: "김지원" });
    expect(prismaMock.contract.count).toHaveBeenNthCalledWith(1, {
      where: { tenantId: "t1", deletedAt: null, status: { notIn: ["signed", "fulfilling", "closed"] } },
    });
    expect(prismaMock.contract.count).toHaveBeenNthCalledWith(2, {
      where: { tenantId: "t1", deletedAt: null, status: { in: ["signed", "fulfilling", "closed"] } },
    });
  });

  it("getTenant 은 없는 id 면 404 RpcException", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    await expect(service.getTenant("nope")).rejects.toBeInstanceOf(RpcException);
  });

  it("updateTenant 은 변경 후 AuditLog(update/Tenant) 를 기록한다", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(t1);
    prismaMock.tenant.update.mockResolvedValue({ ...t1, status: "suspended" });
    prismaMock.userTenant.count.mockResolvedValue(28);
    prismaMock.contract.count.mockResolvedValue(201);
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    const res = await service.updateTenant({ tenantId: "t1", status: "suspended", actorId: "admin1" });

    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "suspended" },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "update",
        actorId: "admin1",
        targetType: "Tenant",
        targetId: "t1",
        tenantId: "t1",
        detail: expect.objectContaining({
          before: expect.objectContaining({ status: "active" }),
          after: expect.objectContaining({ status: "suspended" }),
        }),
      }),
    });
    expect(res.status).toBe("suspended");
  });

  it("updateTenant 은 없는 id 면 404 RpcException", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    await expect(
      service.updateTenant({ tenantId: "nope", plan: "pro", actorId: "admin1" }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});

describe("AdminService — 감사 로그", () => {
  let service: AdminService;
  const prismaMock = {
    auditLog: { findMany: jest.fn(), count: jest.fn() },
    user: { findMany: jest.fn() },
    tenant: { findMany: jest.fn() },
    contract: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.auditLog.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.tenant.findMany.mockResolvedValue([]);
    prismaMock.contract.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  const row = {
    id: "a1",
    action: "transition",
    actorId: "u1",
    targetType: "Contract",
    targetId: "c1",
    tenantId: "t1",
    detail: { from: "검토 완료", to: "체결 진행" },
    at: new Date("2026-09-15T05:00:00Z"),
  };

  it("사람·회사·계약 이름을 붙여 돌려주고 전체 건수도 함께 준다", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([row]);
    prismaMock.auditLog.count.mockResolvedValue(37);
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "김지원" }]);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: "t1", name: "A상사" }]);
    prismaMock.contract.findMany.mockResolvedValue([{ id: "c1", title: "공급계약" }]);

    const res = await service.getRecentAudit({});

    expect(res.total).toBe(37);
    expect(res.items[0]).toMatchObject({
      actorName: "김지원",
      tenantName: "A상사",
      targetTitle: "공급계약",
    });
  });

  it("기간·회사·행위로 거르고 offset 으로 페이지를 넘긴다", async () => {
    await service.getRecentAudit({
      tenantId: "t1",
      action: "delete",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
      limit: 20,
      offset: 40,
    });

    const where = {
      tenantId: "t1",
      action: "delete",
      at: {
        gte: new Date("2026-09-01T00:00:00.000Z"),
        lte: new Date("2026-09-30T23:59:59.999Z"),
      },
    };
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where,
      take: 20,
      skip: 40,
      orderBy: { at: "desc" },
    });
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith({ where });
  });

  it("모르는 행위 이름과 잘못된 날짜는 조건에서 뺀다", async () => {
    await service.getRecentAudit({ action: "hack", from: "어제" });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("사람 이름으로 찾으면 그 사람들이 한 기록만 본다", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }]);

    await service.getRecentAudit({ actorName: "김" });

    expect(prismaMock.user.findMany).toHaveBeenNthCalledWith(1, {
      where: { name: { contains: "김", mode: "insensitive" } },
      select: { id: true },
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { actorId: { in: ["u1", "u2"] } } }),
    );
  });

  it("이름에 맞는 사람이 없으면 빈 결과를 준다(전체를 보여주지 않는다)", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);

    const res = await service.getRecentAudit({ actorName: "없는사람" });

    expect(res).toEqual({ items: [], total: 0 });
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
  });
});
