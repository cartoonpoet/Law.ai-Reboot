import { RpcException } from "@nestjs/microservices";
import type { CycleTimeStatsRequest } from "@lawai/contracts";
import { StatsService } from "./stats.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("StatsService", () => {
  const findFirstMembership = jest.fn();
  const prismaMock = {
    userTenant: { findFirst: findFirstMembership },
    $queryRaw: jest.fn().mockResolvedValue([]),
    statusEvent: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
    advice: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const service = new StatsService(prismaMock as unknown as PrismaService);

  const req = (over: Partial<CycleTimeStatsRequest> = {}): CycleTimeStatsRequest => ({
    tenantContext: { tenantId: "t1", isSystemAdmin: false },
    viewerId: "u1",
    targetType: "contract",
    ...over,
  });

  const expectRpcStatus = async (promise: Promise<unknown>, status: number) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toMatchObject({ status });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.statusEvent.findFirst.mockResolvedValue(null);
  });

  it("법무팀이면 집계를 돌려준다", async () => {
    findFirstMembership.mockResolvedValue({ role: "inHouseCounsel" });
    const result = await service.cycleTime(req());
    expect(result.targetType).toBe("contract");
    expect(result.total.label).toBe("접수 → 체결");
    expect(result.stages).toHaveLength(6);
  });

  it("법무팀이 아니면 403 으로 막는다", async () => {
    findFirstMembership.mockResolvedValue({ role: "general" });
    await expectRpcStatus(service.cycleTime(req()), 403);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("회사 구성원이 아니면 403 으로 막는다", async () => {
    findFirstMembership.mockResolvedValue(null);
    await expectRpcStatus(service.cycleTime(req()), 403);
  });

  it("시스템관리자는 구성원 조회 없이 통과한다", async () => {
    await service.cycleTime(
      req({ tenantContext: { tenantId: "t1", isSystemAdmin: true } }),
    );
    expect(findFirstMembership).not.toHaveBeenCalled();
  });

  it("알 수 없는 대상은 400", async () => {
    findFirstMembership.mockResolvedValue({ role: "inHouseCounsel" });
    await expectRpcStatus(
      service.cycleTime(req({ targetType: "litigation" as never })),
      400,
    );
  });

  it("시작일이 종료일보다 뒤면 400", async () => {
    findFirstMembership.mockResolvedValue({ role: "inHouseCounsel" });
    await expectRpcStatus(service.cycleTime(req({ from: "2026-09-10", to: "2026-09-01" })), 400);
  });

  it("날짜가 날짜가 아니면 400", async () => {
    findFirstMembership.mockResolvedValue({ role: "inHouseCounsel" });
    await expectRpcStatus(service.cycleTime(req({ from: "어제" })), 400);
  });

  it("자문은 자문 단계로 돌려준다", async () => {
    findFirstMembership.mockResolvedValue({ role: "inHouseCounsel" });
    const result = await service.cycleTime(req({ targetType: "advice" }));
    expect(result.total.label).toBe("접수 → 회신");
    expect(result.stages.map((stage) => stage.status)).toContain("answerApproval");
  });
});
