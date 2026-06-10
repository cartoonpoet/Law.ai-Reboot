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
});
