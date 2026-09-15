import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PublicStatsService } from "./public-stats.service";

describe("PublicStatsService", () => {
  const prismaMock = { contract: { count: jest.fn() } };
  let service: PublicStatsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [PublicStatsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(PublicStatsService);
  });

  it("삭제 안 됨·검토 완료 이후 단계·담당자 배정된 계약만 센다(전체 테넌트 합계)", async () => {
    prismaMock.contract.count.mockResolvedValue(42);

    await expect(service.get()).resolves.toEqual({ reviewedContractCount: 42 });

    expect(prismaMock.contract.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        ownerId: { not: null },
        status: { in: ["reviewDone", "signing", "signed", "fulfilling", "closed"] },
      },
    });
    // 공개 통계라 테넌트로 좁히지 않는다.
    expect(prismaMock.contract.count.mock.calls[0][0].where).not.toHaveProperty("tenantId");
  });
});
