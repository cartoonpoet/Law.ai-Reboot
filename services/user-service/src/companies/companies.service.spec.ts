import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { CompaniesService } from "./companies.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CompaniesService", () => {
  let service: CompaniesService;
  const prismaMock = {
    company: { findMany: jest.fn(), create: jest.fn() },
  };

  const row = {
    id: "c1", type: "company", name: "삼성전자(주)", bizNo: "124-81-00998",
    ceo: "한종희", phone: null, address: null, addressDetail: null,
    managerName: null, managerPhone: null, managerEmail: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(CompaniesService);
  });

  it("search는 name/bizNo/ceo OR contains로 조회하고 ISO 문자열로 변환한다", async () => {
    prismaMock.company.findMany.mockResolvedValue([row]);
    const result = await service.search({ q: "삼성", limit: 5 });
    expect(prismaMock.company.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "삼성", mode: "insensitive" } },
          { bizNo: { contains: "삼성", mode: "insensitive" } },
          { ceo: { contains: "삼성", mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    });
    expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("search는 빈 쿼리면 DB 조회 없이 빈 배열을 반환한다", async () => {
    const result = await service.search({ q: "   " });
    expect(result).toEqual([]);
    expect(prismaMock.company.findMany).not.toHaveBeenCalled();
  });

  it("search는 limit 미지정 시 기본 10건으로 조회한다", async () => {
    prismaMock.company.findMany.mockResolvedValue([]);
    await service.search({ q: "삼성" });
    expect(prismaMock.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it("create는 bizNo 미지정 시 TEMP- 임시번호를 생성한다", async () => {
    prismaMock.company.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...row, ...data }),
    );
    const result = await service.create({ type: "individual", name: "삼성기획" });
    const arg = prismaMock.company.create.mock.calls[0][0].data;
    expect(arg.bizNo).toMatch(/^TEMP-[0-9A-F]{8}$/);
    expect(result.name).toBe("삼성기획");
    expect(result.type).toBe("individual");
  });

  it("create는 bizNo 중복 시 409 RpcException을 던진다", async () => {
    prismaMock.company.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" }),
    );
    await expect(
      service.create({ type: "company", name: "삼성전자(주)", bizNo: "124-81-00998" }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
