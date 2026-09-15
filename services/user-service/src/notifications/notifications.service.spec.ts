import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { NotificationService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * NotificationService 단위 테스트.
 *
 * - createMany: 빈 배열 no-op, 자기알림(recipientId===actorId) 제외, 생성 후 재조회한
 *   PushNotification[] 반환(actorName 포함), best-effort(실패 시 [] 반환).
 *   I1: 재조회 where 에 tenantId 필터 포함 검증.
 * - listForViewer: recipientId 필터 + createdAt desc + actorName 매핑(N+1 회피) + isRead 파생 + unreadCount.
 *   tenantContext 없으면 RpcException (fail-closed, M5).
 * - markRead / markAllRead: where 에 recipientId===viewerId 강제(타인 알림 미영향), viewerId 없으면 no-op.
 *   tenantContext 없으면 RpcException (fail-closed, M5).
 */
describe("NotificationService", () => {
  let service: NotificationService;

  const prismaMock = {
    notification: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(NotificationService);
  });

  describe("createMany", () => {
    it("빈 배열이면 prisma.createMany 를 호출하지 않고 [] 를 반환한다(no-op)", async () => {
      const result = await service.createMany([]);
      expect(result).toEqual([]);
      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("자기알림(recipientId===actorId)은 제외하고, 나머지만 createMany 후 PushNotification[] 반환", async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
      // 생성 후 재조회: 방금 만든 행(id 포함).
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: "n-1",
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          detail: { contractId: "k-1", preview: "안녕" },
          readAt: null,
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
        },
      ]);
      prismaMock.user.findMany.mockResolvedValue([{ id: "u-1", name: "작성자" }]);

      const result = await service.createMany([
        // 자기멘션 → 제외되어야 함
        {
          recipientId: "u-1",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-1",
        },
        // 타인 → 생성
        {
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          detail: { contractId: "k-1", preview: "안녕" },
          tenantId: "tenant-1",
        },
      ]);

      expect(prismaMock.notification.createMany).toHaveBeenCalledTimes(1);
      const arg = prismaMock.notification.createMany.mock.calls[0][0] as {
        data: Array<{ recipientId: string; detail: unknown }>;
      };
      expect(arg.data).toHaveLength(1);
      expect(arg.data[0].recipientId).toBe("u-2");
      expect(arg.data[0].detail).toEqual({ contractId: "k-1", preview: "안녕" });

      // 반환: 수신자별 PushNotification(actorName 포함, isRead 파생).
      expect(result).toEqual([
        {
          recipientId: "u-2",
          notification: {
            id: "n-1",
            type: "comment_mention",
            actorId: "u-1",
            actorName: "작성자",
            targetType: "Comment",
            targetId: "c-1",
            detail: { contractId: "k-1", preview: "안녕" },
            isRead: false,
        isTargetDeleted: false,
            createdAt: "2026-06-22T02:00:00.000Z",
          },
        },
      ]);
    });

    it("자기알림만 있으면 (필터 후 빈 배열) createMany 미호출 + [] 반환", async () => {
      const result = await service.createMany([
        {
          recipientId: "u-1",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-1",
        },
      ]);
      expect(result).toEqual([]);
      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("detail 미지정 시 Prisma.JsonNull 로 저장한다", async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.createMany([
        {
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-1",
        },
      ]);
      const arg = prismaMock.notification.createMany.mock.calls[0][0] as {
        data: Array<{ detail: unknown }>;
      };
      expect(arg.data[0].detail).toBe(Prisma.JsonNull);
    });

    it("tenantId 가 주입되면 생성 data 에 포함된다", async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.createMany([
        {
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-1",
        },
      ]);
      const arg = prismaMock.notification.createMany.mock.calls[0][0] as {
        data: Array<{ tenantId: string }>;
      };
      expect(arg.data[0].tenantId).toBe("tenant-1");
    });

    it("tenantId 가 빈 문자열 fallback 없이 그대로 전달된다(필수 필드)", async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.createMany([
        {
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-abc",
        },
      ]);
      const arg = prismaMock.notification.createMany.mock.calls[0][0] as {
        data: Array<{ tenantId: string }>;
      };
      // tenantId 는 호출부가 제공한 값 그대로 — 빈 문자열 fallback 없음.
      expect(arg.data[0].tenantId).toBe("tenant-abc");
    });

    it("best-effort: prisma 가 reject 해도 예외를 던지지 않고 [] 를 반환한다(swallow)", async () => {
      prismaMock.notification.createMany.mockRejectedValue(
        new Error("db down"),
      );
      await expect(
        service.createMany([
          {
            recipientId: "u-2",
            type: "comment_mention",
            actorId: "u-1",
            targetType: "Comment",
            targetId: "c-1",
            tenantId: "tenant-1",
          },
        ]),
      ).resolves.toEqual([]);
    });

    it("I1: createMany 재조회 where 에 tenantId 필터가 포함된다(타 테넌트 유입 방지)", async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.createMany([
        {
          recipientId: "u-2",
          type: "comment_mention",
          actorId: "u-1",
          targetType: "Comment",
          targetId: "c-1",
          tenantId: "tenant-42",
        },
      ]);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: expect.anything() }),
        }),
      );
      // 구체적 값 확인: 입력 tenantId 집합이 그대로 전달됨.
      const findArg = prismaMock.notification.findMany.mock.calls[0][0] as {
        where: { tenantId: { in: string[] } };
      };
      expect(findArg.where.tenantId).toEqual({ in: ["tenant-42"] });
    });
  });

  describe("listForViewer", () => {
    it("viewerId 없으면 빈 응답({ items:[], unreadCount:0 })을 조기반환한다", async () => {
      const result = await service.listForViewer({});
      expect(result).toEqual({ items: [], unreadCount: 0 });
      expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
      expect(prismaMock.notification.count).not.toHaveBeenCalled();
    });

    it("tenantContext 없으면 RpcException 을 던진다(M5 fail-closed)", async () => {
      await expect(
        service.listForViewer({ viewerId: "u-1" }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
    });

    it("recipientId 필터 + createdAt desc + take(limit)로 조회한다", async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await service.listForViewer({
        viewerId: "u-1",
        limit: 5,
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: "u-1", tenantId: "tenant-1" },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      );
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { recipientId: "u-1", readAt: null, tenantId: "tenant-1" },
      });
    });

    it("tenantContext 가 있으면 tenantScope 를 where 에 합쳐 테넌트 격리한다", async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await service.listForViewer({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: "u-1", tenantId: "tenant-1" },
        }),
      );
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { recipientId: "u-1", readAt: null, tenantId: "tenant-1" },
      });
    });

    it("limit 미지정 시 기본 20을 쓴다", async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);
      await service.listForViewer({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it("actorName 매핑(dedupe 1회 조회) + isRead 파생 + unreadCount 를 반환한다", async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: "n-1",
          type: "comment_mention",
          actorId: "a-1",
          targetType: "Comment",
          targetId: "c-1",
          detail: { contractId: "k-1", preview: "본문" },
          readAt: null,
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
        },
        {
          id: "n-2",
          type: "comment_mention",
          actorId: "a-1", // 같은 actor → dedupe
          targetType: "Comment",
          targetId: "c-2",
          detail: null,
          readAt: new Date("2026-06-22T03:00:00.000Z"), // 읽음
          createdAt: new Date("2026-06-22T01:00:00.000Z"),
        },
      ]);
      prismaMock.notification.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([{ id: "a-1", name: "홍길동" }]);

      const result = await service.listForViewer({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      // actor 조회는 dedupe 된 1개 id 로 1회.
      expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ["a-1"] } } }),
      );

      expect(result.unreadCount).toBe(1);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: "n-1",
        type: "comment_mention",
        actorId: "a-1",
        actorName: "홍길동",
        targetType: "Comment",
        targetId: "c-1",
        detail: { contractId: "k-1", preview: "본문" },
        isRead: false,
        isTargetDeleted: false,
        createdAt: "2026-06-22T02:00:00.000Z",
      });
      // readAt 있는 행 → isRead true, detail null.
      expect(result.items[1].isRead).toBe(true);
      expect(result.items[1].detail).toBeNull();
    });

    it("알림이 가리키는 계약이 삭제됐으면 isTargetDeleted 로 표시한다(삭제 계약만 한 번에 조회)", async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: "n-1",
          type: "comment_mention",
          actorId: "a-1",
          targetType: "Comment",
          targetId: "c-1",
          detail: { contractId: "k-gone", preview: "본문" },
          readAt: null,
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
        },
        {
          id: "n-2",
          type: "comment_mention",
          actorId: "a-1",
          targetType: "Comment",
          targetId: "c-2",
          detail: { contractId: "k-live" },
          readAt: null,
          createdAt: new Date("2026-06-22T01:00:00.000Z"),
        },
      ]);
      prismaMock.notification.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.contract.findMany.mockResolvedValueOnce([{ id: "k-gone" }]);

      const result = await service.listForViewer({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["k-gone", "k-live"] }, deletedAt: { not: null } },
        select: { id: true },
      });
      expect(result.items.map((item) => [item.id, item.isTargetDeleted])).toEqual([
        ["n-1", true],
        ["n-2", false],
      ]);
    });

    it("actor 이름이 없으면 빈 문자열로 매핑한다", async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: "n-1",
          type: "comment_mention",
          actorId: "ghost",
          targetType: "Comment",
          targetId: "c-1",
          detail: null,
          readAt: null,
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
        },
      ]);
      prismaMock.notification.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listForViewer({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });
      expect(result.items[0].actorName).toBe("");
    });
  });

  describe("markRead", () => {
    it("tenantContext 없으면 RpcException 을 던진다(M5 fail-closed)", async () => {
      await expect(
        service.markRead({ id: "n-1", viewerId: "u-1" }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    });

    it("where 에 id + recipientId(viewerId) + readAt:null 을 강제한다(타인 알림 0건)", async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markRead({
        id: "n-1",
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "n-1", recipientId: "u-1", readAt: null, tenantId: "tenant-1" },
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it("tenantContext 가 있으면 where 에 tenantId 를 추가해 타 테넌트 알림 읽음 차단", async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markRead({
        id: "n-1",
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "n-1", recipientId: "u-1", readAt: null, tenantId: "tenant-1" },
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it("viewerId 없으면 no-op(updateMany 미호출)", async () => {
      await service.markRead({ id: "n-1" });
      expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("markAllRead", () => {
    it("tenantContext 없으면 RpcException 을 던진다(M5 fail-closed)", async () => {
      await expect(
        service.markAllRead({ viewerId: "u-1" }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    });

    it("where 에 recipientId(viewerId) + readAt:null 강제로 본인 안읽음만 갱신한다", async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllRead({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-1", isSystemAdmin: false },
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: "u-1", readAt: null, tenantId: "tenant-1" },
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it("tenantContext 가 있으면 where 에 tenantId 를 추가해 타 테넌트 알림 일괄 읽음 차단", async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllRead({
        viewerId: "u-1",
        tenantContext: { tenantId: "tenant-2", isSystemAdmin: false },
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: "u-1", readAt: null, tenantId: "tenant-2" },
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it("viewerId 없으면 no-op", async () => {
      await service.markAllRead({});
      expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    });
  });
});
