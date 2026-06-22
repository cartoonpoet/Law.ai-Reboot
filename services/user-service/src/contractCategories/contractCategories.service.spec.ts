import { Test } from "@nestjs/testing";
import { ContractCategoriesService } from "./contractCategories.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ContractCategoriesService", () => {
  let service: ContractCategoriesService;
  const prismaMock = {
    contractCategory: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractCategoriesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(ContractCategoriesService);
  });

  it("list는 sortOrder asc, name asc 정렬로 조회하고 flat DTO로 매핑한다", async () => {
    const rows = [
      {
        id: "root-1",
        name: "개발/공급",
        slug: "dev-supply",
        parentId: null,
        sortOrder: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "mid-1",
        name: "소프트웨어",
        slug: "dev-supply.software",
        parentId: "root-1",
        sortOrder: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "leaf-1",
        name: "SaaS 이용",
        slug: "dev-supply.software.saas",
        parentId: "mid-1",
        sortOrder: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    prismaMock.contractCategory.findMany.mockResolvedValue(rows);

    const result = await service.list();

    expect(prismaMock.contractCategory.findMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    expect(result).toEqual([
      { id: "root-1", name: "개발/공급", slug: "dev-supply", parentId: null, sortOrder: 0 },
      { id: "mid-1", name: "소프트웨어", slug: "dev-supply.software", parentId: "root-1", sortOrder: 0 },
      { id: "leaf-1", name: "SaaS 이용", slug: "dev-supply.software.saas", parentId: "mid-1", sortOrder: 0 },
    ]);
    // createdAt 등 비DTO 필드는 노출하지 않는다.
    expect(result[0]).not.toHaveProperty("createdAt");
  });

  it("list는 행이 없으면 빈 배열을 반환한다", async () => {
    prismaMock.contractCategory.findMany.mockResolvedValue([]);
    const result = await service.list();
    expect(result).toEqual([]);
  });
});
