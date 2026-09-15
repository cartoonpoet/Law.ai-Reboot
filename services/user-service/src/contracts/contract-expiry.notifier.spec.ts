import { ContractExpiryNotifier, SYSTEM_ACTOR_ID } from "./contract-expiry.notifier";

describe("ContractExpiryNotifier", () => {
  const prisma = {
    contract: { findMany: jest.fn() },
    notification: { findMany: jest.fn() },
  };
  const notifications = { createMany: jest.fn().mockResolvedValue([]) };
  const notifier = new ContractExpiryNotifier(prisma as never, notifications as never);
  // 한국 시간 9/15 정오 — 날짜 경계는 UTC 자정(9/15 00:00Z).
  const NOW = new Date("2026-09-15T03:00:00.000Z");
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.findMany.mockResolvedValue([]);
  });

  it("체결·이행 중이고 90일 안에 만료되는 계약만 조회한다", async () => {
    prisma.contract.findMany.mockResolvedValue([]);
    await notifier.notifyExpiring(NOW);
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          status: { in: ["signed", "fulfilling"] },
          periodEnd: { gte: day("2026-09-15"), lte: day("2026-12-14") },
        },
      }),
    );
  });

  it("남은 일수에 맞는 가장 가까운 시점(7·30·90일) 하나만, 담당자·요청자·작성자에게 한 번씩 보낸다", async () => {
    prisma.contract.findMany.mockResolvedValue([
      { id: "A", title: "공급계약", tenantId: "t1", periodEnd: day("2026-09-22"), ownerId: "o1", requesterId: "r1", createdById: "c1" },
      { id: "B", title: "용역계약", tenantId: "t1", periodEnd: day("2026-10-10"), ownerId: null, requesterId: null, createdById: "c2" },
      // 담당자와 작성자가 같은 사람이면 한 번만.
      { id: "C", title: "임대차계약", tenantId: "t2", periodEnd: day("2026-12-10"), ownerId: "o1", requesterId: null, createdById: "o1" },
    ]);
    // A 의 7일 알림은 o1 에게 이미 보냈다.
    prisma.notification.findMany.mockResolvedValue([{ recipientId: "o1", type: "contract_expiring_7", targetId: "A" }]);

    const count = await notifier.notifyExpiring(NOW);

    const created = notifications.createMany.mock.calls[0][0] as Array<{
      recipientId: string;
      type: string;
      targetId: string;
      actorId: string;
      tenantId: string;
      detail: { preview: string; daysLeft: number; contractId: string };
    }>;
    expect(created.map((n) => [n.targetId, n.recipientId, n.type])).toEqual([
      ["A", "r1", "contract_expiring_7"],
      ["A", "c1", "contract_expiring_7"],
      ["B", "c2", "contract_expiring_30"],
      ["C", "o1", "contract_expiring_90"],
    ]);
    expect(created[0]).toMatchObject({
      actorId: SYSTEM_ACTOR_ID,
      targetType: "Contract",
      tenantId: "t1",
      detail: { contractId: "A", preview: "공급계약 · 2026-09-22 만료 (7일 남음)", daysLeft: 7 },
    });
    expect(count).toBe(4);
  });

  it("오늘 만료되는 계약은 '오늘 만료'로 알린다", async () => {
    prisma.contract.findMany.mockResolvedValue([
      { id: "D", title: "NDA", tenantId: "t1", periodEnd: day("2026-09-15"), ownerId: null, requesterId: null, createdById: "c1" },
    ]);
    await notifier.notifyExpiring(NOW);
    expect(notifications.createMany.mock.calls[0][0][0].detail.preview).toBe("NDA · 2026-09-15 만료 (오늘 만료)");
  });

  it("만료 임박 계약이 없거나 모두 이미 보냈으면 알림을 만들지 않는다", async () => {
    prisma.contract.findMany.mockResolvedValueOnce([]);
    expect(await notifier.notifyExpiring(NOW)).toBe(0);

    prisma.contract.findMany.mockResolvedValueOnce([
      { id: "A", title: "공급계약", tenantId: "t1", periodEnd: day("2026-09-22"), ownerId: null, requesterId: null, createdById: "c1" },
    ]);
    prisma.notification.findMany.mockResolvedValueOnce([{ recipientId: "c1", type: "contract_expiring_7", targetId: "A" }]);
    expect(await notifier.notifyExpiring(NOW)).toBe(0);

    expect(notifications.createMany).not.toHaveBeenCalled();
  });
});
