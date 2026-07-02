import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it("create는 전달된 필드로 사용자를 만든다", async () => {
    const row = {
      id: "u1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      createdAt: new Date("2026-01-01"),
    };
    prismaMock.user.create.mockResolvedValue(row);

    const result = await service.create({
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "a@b.com", name: "A", passwordHash: "h" },
    });
    expect(result.email).toBe("a@b.com");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("findByEmail은 해시를 포함해 반환한다 (내부용)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      createdAt: new Date("2026-01-01"),
    });
    const result = await service.findByEmail({ email: "a@b.com" });
    expect(result?.passwordHash).toBe("h");
  });

  it("findByEmail은 없으면 null을 반환한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const result = await service.findByEmail({ email: "x@y.com" });
    expect(result).toBeNull();
  });

  it("create는 중복 이메일(P2002)이면 409 RpcException을 던진다", async () => {
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.0.0",
      }),
    );
    await expect(
      service.create({ email: "a@b.com", name: "A", passwordHash: "h" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  describe("search", () => {
    const userRow = {
      id: "u1",
      email: "a@b.com",
      name: "홍길동",
      passwordHash: "h",
      isSystemAdmin: false,
      departmentId: "d1",
      createdAt: new Date("2026-01-01"),
      department: { name: "법무팀" },
    };

    it("tenantContext(일반 사용자)면 tenantMemberships 조인으로 같은 테넌트 사용자만 반환", async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow]);

      const result = await service.search({
        q: "홍",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantMemberships: { some: { tenantId: "tenant-1" } },
            OR: expect.any(Array),
          }),
        }),
      );
      expect(result[0].name).toBe("홍길동");
      expect(result[0].departmentName).toBe("법무팀");
    });

    it("admin(isSystemAdmin=true)은 tenantMemberships 조인 없이 전체 사용자 검색", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.search({
        q: "홍",
        tenantContext: { isSystemAdmin: true },
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ tenantMemberships: expect.anything() }),
        }),
      );
    });

    it("tenantContext 없으면 tenantMemberships 조인 없이 전체 검색(하위 호환)", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.search({ q: "홍" });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ tenantMemberships: expect.anything() }),
        }),
      );
    });

    it("q 없으면 전체 조회(tenantScope 포함)", async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow]);

      await service.search({
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantMemberships: { some: { tenantId: "tenant-1" } } },
        }),
      );
    });
  });
});
