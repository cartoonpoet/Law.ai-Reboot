import { Test } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AdminService — 삭제된 계약 복구", () => {
  let service: AdminService;
  const prismaMock = {
    contract: { findMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    tenant: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn(), create: jest.fn() },
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  describe("listDeletedContracts", () => {
    it("삭제된 계약만 최근 삭제 순으로, 회사 이름·작성자·가장 최근에 삭제한 사람과 함께 돌려준다", async () => {
      prismaMock.contract.findMany.mockResolvedValue([
        {
          id: "ct-1", code: "C20260915-0001", title: "공급계약", status: "legalReview", tenantId: "t1",
          deletedAt: new Date("2026-09-15T03:00:00.000Z"), createdBy: { name: "김작성" },
        },
        {
          id: "ct-2", code: "C20260914-0002", title: "용역계약", status: "unassigned", tenantId: "t2",
          deletedAt: new Date("2026-09-14T03:00:00.000Z"), createdBy: { name: "박작성" },
        },
      ]);
      prismaMock.tenant.findMany.mockResolvedValue([
        { id: "t1", name: "A상사" },
        { id: "t2", name: "B테크" },
      ]);
      // at desc — ct-1 은 두 번 지워졌고 최근 삭제자는 admin-2.
      prismaMock.auditLog.findMany.mockResolvedValue([
        { targetId: "ct-1", actorId: "admin-2" },
        { targetId: "ct-1", actorId: "admin-1" },
      ]);
      prismaMock.user.findMany.mockResolvedValue([{ id: "admin-2", name: "이관리" }]);

      const res = await service.listDeletedContracts();

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
      );
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetType: "Contract", action: "delete", targetId: { in: ["ct-1", "ct-2"] } },
          orderBy: { at: "desc" },
        }),
      );
      expect(res.items).toEqual([
        {
          id: "ct-1", code: "C20260915-0001", title: "공급계약", status: "legalReview",
          tenantId: "t1", tenantName: "A상사", createdByName: "김작성", deletedByName: "이관리",
          deletedAt: "2026-09-15T03:00:00.000Z",
        },
        {
          id: "ct-2", code: "C20260914-0002", title: "용역계약", status: "unassigned",
          tenantId: "t2", tenantName: "B테크", createdByName: "박작성", deletedByName: null,
          deletedAt: "2026-09-14T03:00:00.000Z",
        },
      ]);
    });

    it("삭제된 계약이 없으면 추가 조회 없이 빈 목록", async () => {
      prismaMock.contract.findMany.mockResolvedValue([]);
      await expect(service.listDeletedContracts()).resolves.toEqual({ items: [] });
      expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
      expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe("restoreContract", () => {
    const deletedRow = { id: "ct-1", code: "C20260915-0001", title: "공급계약", tenantId: "t1" };

    it("삭제 표시를 지우고 복구 감사 기록을 남긴다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(deletedRow);
      prismaMock.contract.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.restoreContract({ contractId: "ct-1", actorId: "admin-1" })).resolves.toEqual({ ok: true });

      expect(prismaMock.contract.updateMany).toHaveBeenCalledWith({
        where: { id: "ct-1", deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: "restore",
          actorId: "admin-1",
          targetType: "Contract",
          targetId: "ct-1",
          tenantId: "t1",
          detail: { code: "C20260915-0001", title: "공급계약" },
        },
      });
    });

    it("삭제된 계약이 아니면(없거나 이미 복구) 404 이고 아무것도 바꾸지 않는다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);
      await expect(service.restoreContract({ contractId: "ct-x", actorId: "admin-1" })).rejects.toMatchObject({
        error: { status: 404 },
      });
      expect(prismaMock.contract.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    });

    it("그 사이 다른 관리자가 먼저 복구했으면 404 이고 감사 기록을 남기지 않는다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(deletedRow);
      prismaMock.contract.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.restoreContract({ contractId: "ct-1", actorId: "admin-1" })).rejects.toMatchObject({
        error: { status: 404 },
      });
      expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
