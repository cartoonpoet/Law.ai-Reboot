import { StatusEventsService } from "./status-events.service";
import type { PrismaService } from "../../prisma/prisma.service";

describe("StatusEventsService", () => {
  const create = jest.fn();
  const prisma = { statusEvent: { create } } as unknown as PrismaService;
  const service = new StatusEventsService(prisma);

  const params = {
    tenantId: "t1",
    targetType: "contract" as const,
    targetId: "c1",
    fromStatus: "legalReview",
    toStatus: "reviewDone",
  };

  beforeEach(() => jest.clearAllMocks());

  it("상태가 바뀌면 한 줄 남긴다", async () => {
    create.mockResolvedValue({});
    await service.record({ ...params, ownerId: "owner", actorId: "actor" });
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: "t1",
        targetType: "contract",
        targetId: "c1",
        fromStatus: "legalReview",
        toStatus: "reviewDone",
        ownerId: "owner",
        actorId: "actor",
      },
    });
  });

  it("같은 상태로 바뀌는 건 남기지 않는다", async () => {
    await service.record({ ...params, toStatus: "legalReview" });
    expect(create).not.toHaveBeenCalled();
  });

  it("담당자·처리자를 안 주면 null 로 남긴다", async () => {
    create.mockResolvedValue({});
    await service.record(params);
    expect(create.mock.calls[0][0].data).toMatchObject({ ownerId: null, actorId: null });
  });

  it("시각을 직접 주면 그 시각으로 남긴다(백필)", async () => {
    create.mockResolvedValue({});
    const at = new Date("2026-01-02T03:04:05.000Z");
    await service.record({ ...params, at });
    expect(create.mock.calls[0][0].data.at).toBe(at);
  });

  it("기록이 실패해도 예외를 밖으로 던지지 않는다", async () => {
    create.mockRejectedValue(new Error("DB 죽음"));
    await expect(service.record(params)).resolves.toBeUndefined();
  });
});
