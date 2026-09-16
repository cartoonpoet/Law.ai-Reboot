import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { SupportService } from "./support.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";

describe("SupportService (문의·상담)", () => {
  let service: SupportService;
  const prismaMock = {
    supportThread: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { findMany: jest.fn() },
    tenant: { findMany: jest.fn() },
  };
  const notificationsMock = { createMany: jest.fn() };

  const ctx = { tenantId: "t1", isSystemAdmin: false };
  const at = (iso: string) => new Date(iso);

  const message = (over: Partial<Record<string, unknown>> = {}) => ({
    id: "m1",
    threadId: "s1",
    authorId: "u1",
    authorRole: "user",
    body: "계약 상세에서 오류가 났어요",
    createdAt: at("2026-09-16T01:00:00Z"),
    ...over,
  });

  const thread = (over: Partial<Record<string, unknown>> = {}) => ({
    id: "s1",
    tenantId: "t1",
    userId: "u1",
    subject: "계약 상세 오류",
    status: "open",
    context: { path: "/contract/c1", errorKind: "server" },
    lastMessageAt: at("2026-09-16T01:00:00Z"),
    createdAt: at("2026-09-16T01:00:00Z"),
    updatedAt: at("2026-09-16T01:00:00Z"),
    messages: [message()],
    ...over,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "손준호", email: "son@lawai.kr" }]);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: "t1", name: "휴맥스아이티" }]);
    notificationsMock.createMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    }).compile();
    service = moduleRef.get(SupportService);
  });

  describe("문의 남기기", () => {
    it("첫 메시지와 함께 문의를 만들고 글쓴이 이름을 붙여 돌려준다", async () => {
      prismaMock.supportThread.create.mockResolvedValue(thread());

      const res = await service.createThread({
        userId: "u1",
        tenantContext: ctx,
        subject: "계약 상세 오류",
        body: "계약 상세에서 오류가 났어요",
        context: { path: "/contract/c1", errorKind: "server" },
      });

      expect(prismaMock.supportThread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "t1",
            userId: "u1",
            subject: "계약 상세 오류",
            messages: { create: { authorId: "u1", authorRole: "user", body: "계약 상세에서 오류가 났어요" } },
          }),
        }),
      );
      expect(res.status).toBe("open");
      expect(res.messages[0]).toMatchObject({ authorRole: "user", authorName: "손준호" });
      expect(res.context).toEqual({ path: "/contract/c1", errorKind: "server" });
    });

    it("내용이 비어 있으면 400", async () => {
      await expect(
        service.createThread({ userId: "u1", tenantContext: ctx, subject: "제목", body: "   " }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.supportThread.create).not.toHaveBeenCalled();
    });

    it("소속 회사가 없으면 문의를 만들지 않는다", async () => {
      await expect(
        service.createThread({
          userId: "u1",
          tenantContext: { isSystemAdmin: true },
          subject: "제목",
          body: "내용",
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe("내 문의 목록", () => {
    it("최근 순으로 주고, 답변이 온 문의 수를 함께 센다", async () => {
      prismaMock.supportThread.findMany.mockResolvedValue([
        thread({ id: "s2", status: "answered", messages: [message({ id: "m2", authorRole: "admin", body: "확인했습니다" })] }),
        thread(),
      ]);

      const res = await service.listMyThreads({ userId: "u1", tenantContext: ctx });

      expect(prismaMock.supportThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", tenantId: "t1" }, orderBy: { lastMessageAt: "desc" } }),
      );
      expect(res.answeredCount).toBe(1);
      expect(res.threads[0]).toMatchObject({ id: "s2", lastMessageRole: "admin", lastMessagePreview: "확인했습니다" });
    });
  });

  describe("이어서 말하기", () => {
    it("내 문의가 아니면 404", async () => {
      prismaMock.supportThread.findFirst.mockResolvedValue(null);
      await expect(
        service.addMessage({ userId: "u2", threadId: "s1", body: "추가 내용", tenantContext: ctx }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("종료된 문의에는 이어 쓸 수 없다", async () => {
      prismaMock.supportThread.findFirst.mockResolvedValue(thread({ status: "closed" }));
      await expect(
        service.addMessage({ userId: "u1", threadId: "s1", body: "추가 내용", tenantContext: ctx }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.supportThread.update).not.toHaveBeenCalled();
    });

    it("이어 쓰면 다시 답변 대기 상태가 된다", async () => {
      prismaMock.supportThread.findFirst.mockResolvedValue(thread({ status: "answered" }));
      prismaMock.supportThread.update.mockResolvedValue(thread());

      await service.addMessage({ userId: "u1", threadId: "s1", body: "아직 안 돼요", tenantContext: ctx });

      expect(prismaMock.supportThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "s1" },
          data: expect.objectContaining({
            status: "open",
            messages: { create: { authorId: "u1", authorRole: "user", body: "아직 안 돼요" } },
          }),
        }),
      );
    });
  });

  describe("관리자 답변", () => {
    it("답변하면 상태가 '답변 옴'이 되고 문의한 사람에게 알림을 만든다", async () => {
      prismaMock.supportThread.findUnique.mockResolvedValue(thread());
      prismaMock.supportThread.update.mockResolvedValue(
        thread({ status: "answered", messages: [message(), message({ id: "m2", authorId: "admin1", authorRole: "admin", body: "고쳤습니다" })] }),
      );
      const push = [{ recipientId: "u1", notification: { id: "n1" } }];
      notificationsMock.createMany.mockResolvedValue(push);

      const res = await service.adminReply({ threadId: "s1", actorId: "admin1", body: "고쳤습니다" });

      expect(prismaMock.supportThread.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "answered" }) }),
      );
      expect(notificationsMock.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          recipientId: "u1",
          type: "support_reply",
          targetType: "SupportThread",
          targetId: "s1",
          tenantId: "t1",
        }),
      ]);
      expect(res.notifications).toBe(push);
      expect(res.thread.userName).toBe("손준호");
      expect(res.thread.tenantName).toBe("휴맥스아이티");
    });

    it("답변하면서 종료하면 상태가 '종료'가 된다", async () => {
      prismaMock.supportThread.findUnique.mockResolvedValue(thread());
      prismaMock.supportThread.update.mockResolvedValue(thread({ status: "closed" }));

      await service.adminReply({ threadId: "s1", actorId: "admin1", body: "해결됐습니다", close: true });

      expect(prismaMock.supportThread.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "closed" }) }),
      );
    });

    it("없는 문의면 404", async () => {
      prismaMock.supportThread.findUnique.mockResolvedValue(null);
      await expect(
        service.adminReply({ threadId: "nope", actorId: "admin1", body: "답변" }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe("관리자 목록", () => {
    it("상태로 거르고 전체 건수와 대기 건수를 함께 준다", async () => {
      prismaMock.supportThread.findMany.mockResolvedValue([thread()]);
      prismaMock.supportThread.count.mockResolvedValueOnce(12).mockResolvedValueOnce(5);

      const res = await service.adminList({ status: "open", limit: 20, offset: 0 });

      expect(prismaMock.supportThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "open" }, take: 20, skip: 0 }),
      );
      expect(res).toMatchObject({ total: 12, openCount: 5 });
      expect(res.items[0]).toMatchObject({ userName: "손준호", tenantName: "휴맥스아이티" });
    });
  });
});
