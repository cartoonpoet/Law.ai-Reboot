import { Test } from "@nestjs/testing";
import { DepartmentsService } from "./departments.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * DepartmentsService 단위 테스트.
 *
 * - list: name asc 정렬로 조회하고 DepartmentDto[] 로 매핑.
 * - 테넌트 격리: tenantContext 있으면 tenantScope 를 where 에 합쳐 타 테넌트 부서 차단.
 */
describe("DepartmentsService", () => {
  let service: DepartmentsService;
  const prismaMock = {
    department: { findMany: jest.fn() },
  };

  const rows = [
    { id: "d1", name: "법무팀", tenantId: "tenant-1", createdAt: new Date() },
    { id: "d2", name: "재무팀", tenantId: "tenant-1", createdAt: new Date() },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(DepartmentsService);
  });

  it("list는 name asc 정렬로 조회하고 DepartmentDto[] 로 매핑한다", async () => {
    prismaMock.department.findMany.mockResolvedValue(rows);

    const result = await service.list({
      tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
    });

    expect(prismaMock.department.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([
      { id: "d1", name: "법무팀" },
      { id: "d2", name: "재무팀" },
    ]);
    // tenantId 등 비DTO 필드는 노출하지 않는다.
    expect(result[0]).not.toHaveProperty("tenantId");
  });

  it("list는 행이 없으면 빈 배열을 반환한다", async () => {
    prismaMock.department.findMany.mockResolvedValue([]);
    const result = await service.list({
      tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
    });
    expect(result).toEqual([]);
  });

  it("admin(isSystemAdmin=true)은 tenantScope 비어 있어 where 없이 전체 조회한다", async () => {
    prismaMock.department.findMany.mockResolvedValue([]);
    await service.list({ tenantContext: { isSystemAdmin: true } });
    expect(prismaMock.department.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { name: "asc" },
    });
  });

  it("tenantContext 없으면 where 없이 전체 조회(하위 호환)", async () => {
    prismaMock.department.findMany.mockResolvedValue([]);
    await service.list();
    expect(prismaMock.department.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { name: "asc" },
    });
  });
});
