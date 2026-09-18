import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { AdvicesService } from "./advices.service";
import { PrismaService } from "../prisma/prisma.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { NotificationService } from "../notifications/notifications.service";

describe("AdvicesService (법률자문)", () => {
  let service: AdvicesService;
  const prismaMock = {
    advice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    userTenant: { findFirst: jest.fn() },
    file: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };

  const approvalsMock = { submit: jest.fn(), getActive: jest.fn() };
  const notificationsMock = { createMany: jest.fn() };
  const NO_LINE = { line: null, historyCount: 0 };

  const ctx = { tenantId: "t1", isSystemAdmin: false };
  const ROLES: Record<string, string> = {
    requester: "general",
    owner: "inHouseCounsel",
    legal: "inHouseCounsel",
    sales: "general",
    boss: "general",
  };

  const row = (over: Partial<Record<string, unknown>> = {}) => ({
    id: "a1",
    code: "ADV-2026-0091",
    title: "해외 대리점 계약 준거법 문의",
    status: "reviewing",
    securityLevel: "secure",
    categories: ["계약해석"],
    region: "overseas",
    countries: ["VN"],
    requesterId: "requester",
    ownerId: "owner",
    createdById: "requester",
    tenantId: "t1",
    background: "<p>배경</p>",
    question: "<p>질의</p>",
    etcRequest: null,
    dueDate: new Date("2026-09-18T00:00:00Z"),
    details: { ccUsers: [], ccDepts: [], ccSecret: [{ id: "boss", name: "정민규" }], project: null, counterparty: "" },
    answeredAt: null,
    closedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-09-14T00:00:00Z"),
    updatedAt: new Date("2026-09-16T00:00:00Z"),
    messages: [],
    ...over,
  });

  const createInput = {
    viewerId: "requester",
    tenantContext: ctx,
    title: "해외 대리점 계약 준거법 문의",
    categories: ["계약해석"],
    securityLevel: "secure" as const,
    requesterId: "requester",
    ownerId: null,
    region: "overseas" as const,
    countries: ["VN"],
    background: "<p>배경</p>",
    question: "<p>질의</p>",
    etcRequest: "",
    dueDate: "2026-09-18",
    details: { ccUsers: [], ccDepts: [], ccSecret: [], project: null, counterparty: "" },
    approvers: [{ userId: "requester", name: "김수현", dept: "영업1팀", type: "draft" as const }],
  };

  const bossApprovers = [
    { userId: "requester", name: "김수현", dept: "영업1팀", type: "draft" as const },
    { userId: "boss", name: "정민규", dept: "영업1팀", type: "approve" as const },
  ];

  const line = (targetType: string, userIds: string[]) => ({
    line: {
      id: `line-${targetType}`,
      targetType,
      targetId: "a1",
      title: "",
      status: "pending",
      submittedById: "requester",
      submittedByName: "",
      submittedAt: "2026-09-14T00:00:00.000Z",
      decidedAt: null,
      currentStepId: null,
      steps: userIds.map((userId, index) => ({
        id: `s${index}`,
        stepOrder: index,
        userId,
        name: userId,
        avatarUrl: null,
        dept: "",
        type: "approve",
        status: "pending",
        comment: null,
        decidedAt: null,
      })),
    },
    historyCount: 0,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.userTenant.findFirst.mockImplementation(({ where }: { where: { userId: string } }) =>
      Promise.resolve(ROLES[where.userId] ? { id: `m-${where.userId}`, role: ROLES[where.userId] } : null),
    );
    prismaMock.user.findMany.mockResolvedValue([
      { id: "requester", name: "김수현", department: { name: "영업1팀" } },
      { id: "owner", name: "박지훈", department: { name: "법무팀" } },
    ]);
    prismaMock.file.findMany.mockResolvedValue([]);
    approvalsMock.getActive.mockResolvedValue(NO_LINE);
    notificationsMock.createMany.mockImplementation((items: { recipientId: string }[]) =>
      Promise.resolve(items.map((item) => ({ recipientId: item.recipientId, notification: {} }))),
    );
    approvalsMock.submit.mockResolvedValue({ line: {}, notifications: [{ recipientId: "boss", notification: {} }] });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdvicesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ApprovalsService, useValue: approvalsMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    }).compile();
    service = moduleRef.get(AdvicesService);
  });

  const expectRpcStatus = async (promise: Promise<unknown>, status: number) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toMatchObject({ status });
  };

  describe("요청", () => {
    it("담당자 없이 요청하면 접수 상태로 만들고 관리번호를 붙인다", async () => {
      prismaMock.advice.create.mockResolvedValue(row({ status: "received", ownerId: null }));

      const res = await service.create(createInput);

      const { data } = prismaMock.advice.create.mock.calls[0][0];
      expect(data).toMatchObject({ status: "received", createdById: "requester", tenantId: "t1", etcRequest: null });
      expect(data.code).toMatch(/^ADV-\d{4}-\d{4}$/);
      expect(res.advice.requester).toEqual({ id: "requester", name: "김수현", dept: "영업1팀" });
      expect(approvalsMock.submit).not.toHaveBeenCalled();
      expect(res.notifications).toEqual([]);
    });

    it("담당자를 정해 요청하면 바로 법무 검토로 시작한다", async () => {
      prismaMock.advice.create.mockResolvedValue(row());
      await service.create({ ...createInput, ownerId: "owner" });
      expect(prismaMock.advice.create.mock.calls[0][0].data).toMatchObject({ status: "reviewing", ownerId: "owner" });
    });

    it("결재선에 결재자가 있으면 요청 결재 중으로 만들고 결재를 올린다", async () => {
      prismaMock.advice.create.mockResolvedValue(row({ status: "requestApproval", ownerId: null }));

      const res = await service.create({ ...createInput, approvers: bossApprovers });

      expect(prismaMock.advice.create.mock.calls[0][0].data.status).toBe("requestApproval");
      expect(approvalsMock.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: "advice_request",
          targetId: "a1",
          title: "해외 대리점 계약 준거법 문의",
          steps: [
            { userId: "requester", name: "김수현", dept: "영업1팀", type: "draft" },
            { userId: "boss", name: "정민규", dept: "영업1팀", type: "approve" },
          ],
        }),
      );
      expect(res.notifications).toHaveLength(1);
    });

    it("결재자가 지정되지 않은 결재 단계는 받지 않는다", async () => {
      const approvers = [{ userId: null, name: "미지정", dept: "", type: "approve" as const }];
      await expectRpcStatus(service.create({ ...createInput, approvers }), 400);
      expect(prismaMock.advice.create).not.toHaveBeenCalled();
    });

    it("법무팀이 아닌 사람을 담당자로 지정하면 거절한다", async () => {
      await expectRpcStatus(service.create({ ...createInput, ownerId: "sales" }), 400);
      expect(prismaMock.advice.create).not.toHaveBeenCalled();
    });

    it("에디터에 글자 없이 태그만 있으면 비어 있다고 거절한다", async () => {
      await expectRpcStatus(service.create({ ...createInput, question: "<p> </p>" }), 400);
    });

    it("관리번호가 겹치면 새 번호로 다시 만든다", async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" });
      prismaMock.advice.create.mockRejectedValueOnce(conflict).mockResolvedValueOnce(row({ status: "received" }));
      await service.create(createInput);
      expect(prismaMock.advice.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("조회", () => {
    it("일반 사용자 목록은 본인 관련 자문으로 좁히고 상태별 건수를 함께 준다", async () => {
      prismaMock.advice.findMany.mockResolvedValue([row()]);
      prismaMock.advice.count.mockResolvedValue(1);
      prismaMock.advice.groupBy.mockResolvedValue([{ status: "reviewing", _count: { _all: 1 } }]);

      const res = await service.list({ viewerId: "requester", tenantContext: ctx, statuses: "reviewing,bogus" });

      const { where } = prismaMock.advice.findMany.mock.calls[0][0];
      expect(JSON.stringify(where)).toContain('"requesterId":"requester"');
      expect(where.AND[1]).toEqual({ status: { in: ["reviewing"] } });
      expect(res.counts).toEqual({
        requestApproval: 0,
        requestRejected: 0,
        received: 0,
        reviewing: 1,
        waitingRequester: 0,
        answerApproval: 0,
        answered: 0,
        closed: 0,
      });
      expect(res.items[0].owner).toEqual({ id: "owner", name: "박지훈", dept: "법무팀" });
    });

    it("자문에 올린 첨부 파일을 함께 내려준다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      prismaMock.file.findMany.mockResolvedValue([
        { id: "f1", name: "협의 메일.pdf", size: 1024, mimeType: "application/pdf", checksum: "abc", createdAt: new Date("2026-09-14T00:00:00Z") },
      ]);

      const res = await service.get({ viewerId: "owner", tenantContext: ctx, id: "a1" });

      expect(prismaMock.file.findMany).toHaveBeenCalledWith({ where: { adviceId: "a1" }, orderBy: { sortOrder: "asc" } });
      expect(res.files).toEqual([
        { id: "f1", name: "협의 메일.pdf", size: 1024, mimeType: "application/pdf", sha256: "abc", createdAt: "2026-09-14T00:00:00.000Z" },
      ]);
    });

    it("관계없는 사람이 상세를 열면 있는지 알리지 않고 404", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      await expectRpcStatus(service.get({ viewerId: "sales", tenantContext: ctx, id: "a1" }), 404);
    });

    it("결재선에 든 사람은 관계없는 자문도 열어 결재할 수 있다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "requestApproval" }));
      approvalsMock.getActive.mockImplementation((targetType: string) =>
        Promise.resolve(targetType === "advice_request" ? line(targetType, ["boss"]) : NO_LINE),
      );

      const res = await service.get({ viewerId: "boss", tenantContext: ctx, id: "a1" });

      expect(res.requestApproval?.id).toBe("line-advice_request");
      expect(res.answerApproval).toBeNull();
    });

    it("결재 중인 회신은 요청자에게 보이지 않고 담당자에게는 보인다", async () => {
      const messages = [
        { id: "m1", adviceId: "a1", authorId: "owner", kind: "followup", state: "published", body: "질의", createdAt: new Date() },
        { id: "m2", adviceId: "a1", authorId: "owner", kind: "answer", state: "pendingApproval", body: "회신 초안", createdAt: new Date() },
      ];
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "answerApproval", messages }));

      const forRequester = await service.get({ viewerId: "requester", tenantContext: ctx, id: "a1" });
      const forOwner = await service.get({ viewerId: "owner", tenantContext: ctx, id: "a1" });

      expect(forRequester.messages.map((message) => message.id)).toEqual(["m1"]);
      expect(forOwner.messages.map((message) => message.state)).toEqual(["published", "pendingApproval"]);
    });

    it("요청자에게는 비밀 참조수신자를 숨긴다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ createdById: "legal" }));
      const res = await service.get({ viewerId: "requester", tenantContext: ctx, id: "a1" });
      expect(res.details.ccSecret).toEqual([]);
      expect(res.permissions.canReply).toBe(true);
    });
  });

  describe("진행", () => {
    it("접수된 자문에 담당을 배정하면 검토를 시작한다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "received", ownerId: null }));
      prismaMock.advice.update.mockResolvedValue(row());

      const res = await service.assign({ viewerId: "legal", tenantContext: ctx, id: "a1", ownerId: "owner" });

      expect(prismaMock.advice.update.mock.calls[0][0].data).toEqual({ ownerId: "owner", status: "reviewing" });
      expect(notificationsMock.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ recipientId: "owner", type: "advice_assigned", targetType: "Advice", targetId: "a1" }),
      ]);
      expect(res.notifications).toHaveLength(1);
    });

    it("요청자는 담당을 배정할 수 없다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "received", ownerId: null }));
      await expectRpcStatus(service.assign({ viewerId: "requester", tenantContext: ctx, id: "a1", ownerId: "owner" }), 403);
    });

    it("담당자가 추가 질의를 남기면 요청자 답변 대기로 바뀐다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      prismaMock.advice.update.mockResolvedValue(row({ status: "waitingRequester" }));

      await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "followup", body: "<p>MOQ 조항 확인 부탁드립니다</p>" });

      expect(prismaMock.advice.update.mock.calls[0][0].data).toMatchObject({
        status: "waitingRequester",
        messages: { create: { authorId: "owner", kind: "followup", body: "<p>MOQ 조항 확인 부탁드립니다</p>" } },
      });
    });

    it("회신 결재선이 있으면 회신을 결재 중으로 남기고 회신일은 아직 비워 둔다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      prismaMock.advice.update.mockResolvedValue(row({ status: "answerApproval" }));
      const approvers = [
        { userId: "owner", name: "박지훈", dept: "법무팀", type: "draft" as const },
        { userId: "legal", name: "한은정", dept: "법무팀", type: "approve" as const },
      ];

      const res = await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "answer", body: "<p>SIAC 중재 권고</p>", approvers });

      const { data } = prismaMock.advice.update.mock.calls[0][0];
      expect(data).toMatchObject({
        status: "answerApproval",
        answeredAt: null,
        messages: { create: { kind: "answer", state: "pendingApproval" } },
      });
      expect(approvalsMock.submit).toHaveBeenCalledWith(expect.objectContaining({ targetType: "advice_answer", title: "해외 대리점 계약 준거법 문의" }));
      expect(res.notifications).toHaveLength(1);
    });

    it("요청 결재가 반려되면 작성자가 결재선을 고쳐 다시 올린다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "requestRejected", createdById: "requester", ownerId: null }));
      prismaMock.advice.update.mockResolvedValue(row({ status: "requestApproval" }));

      await service.resubmitRequestApproval({ viewerId: "requester", tenantContext: ctx, id: "a1", approvers: bossApprovers });

      expect(prismaMock.advice.update.mock.calls[0][0].data).toEqual({ status: "requestApproval" });
      expect(approvalsMock.submit).toHaveBeenCalledWith(expect.objectContaining({ targetType: "advice_request" }));
    });

    it("다시 올릴 때 결재자를 모두 빼면 결재 없이 바로 접수한다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "requestRejected", ownerId: null }));
      prismaMock.advice.update.mockResolvedValue(row({ status: "received" }));

      await service.resubmitRequestApproval({ viewerId: "requester", tenantContext: ctx, id: "a1", approvers: createInput.approvers });

      expect(prismaMock.advice.update.mock.calls[0][0].data).toEqual({ status: "received" });
      expect(approvalsMock.submit).not.toHaveBeenCalled();
    });

    it("담당자가 회신하면 회신 완료와 회신일을 남긴다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "waitingRequester" }));
      prismaMock.advice.update.mockResolvedValue(row({ status: "answered" }));

      await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "answer", body: "<p>SIAC 중재를 권합니다</p>" });

      const { data } = prismaMock.advice.update.mock.calls[0][0];
      expect(data.status).toBe("answered");
      expect(data.answeredAt).toBeInstanceOf(Date);
    });

    it("회신 뒤 요청자가 다시 물으면 검토로 돌아가고 회신일을 비운다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "answered", answeredAt: new Date() }));
      prismaMock.advice.update.mockResolvedValue(row());

      await service.addMessage({ viewerId: "requester", tenantContext: ctx, id: "a1", kind: "reply", body: "<p>비용도 알려주세요</p>" });

      expect(prismaMock.advice.update.mock.calls[0][0].data).toMatchObject({ status: "reviewing", answeredAt: null });
    });

    it("추가 질의·답변·회신은 상대에게 알린다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      prismaMock.advice.update.mockResolvedValue(row());

      const followup = await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "followup", body: "확인 부탁" });
      expect(followup.notifications.map((item) => item.recipientId)).toEqual(["requester"]);
      expect(notificationsMock.createMany.mock.calls[0][0][0]).toMatchObject({ type: "advice_followup" });

      prismaMock.advice.findFirst.mockResolvedValue(row({ status: "waitingRequester" }));
      const reply = await service.addMessage({ viewerId: "requester", tenantContext: ctx, id: "a1", kind: "reply", body: "답변합니다" });
      expect(reply.notifications.map((item) => item.recipientId)).toEqual(["owner"]);

      const answer = await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "answer", body: "회신합니다" });
      expect(answer.notifications.map((item) => item.recipientId)).toEqual(["requester"]);
    });

    it("결재를 거치는 회신은 결재 알림만 보내고 요청자에게는 아직 알리지 않는다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      prismaMock.advice.update.mockResolvedValue(row({ status: "answerApproval" }));
      const approvers = [
        { userId: "owner", name: "박지훈", dept: "법무팀", type: "draft" as const },
        { userId: "legal", name: "한은정", dept: "법무팀", type: "approve" as const },
      ];

      await service.addMessage({ viewerId: "owner", tenantContext: ctx, id: "a1", kind: "answer", body: "회신 초안", approvers });

      expect(notificationsMock.createMany).not.toHaveBeenCalled();
      expect(approvalsMock.submit).toHaveBeenCalled();
    });

    it("요청자는 회신을 대신 쓸 수 없다", async () => {
      prismaMock.advice.findFirst.mockResolvedValue(row());
      await expectRpcStatus(
        service.addMessage({ viewerId: "requester", tenantContext: ctx, id: "a1", kind: "answer", body: "<p>셀프 회신</p>" }),
        403,
      );
    });

    it("회신이 끝나기 전에는 종결할 수 없고, 끝나면 종결일을 남긴다", async () => {
      prismaMock.advice.findFirst.mockResolvedValueOnce(row());
      await expectRpcStatus(service.close({ viewerId: "requester", tenantContext: ctx, id: "a1" }), 403);

      prismaMock.advice.findFirst.mockResolvedValueOnce(row({ status: "answered" }));
      prismaMock.advice.update.mockResolvedValue(row({ status: "closed" }));
      const res = await service.close({ viewerId: "requester", tenantContext: ctx, id: "a1" });
      expect(prismaMock.advice.update.mock.calls[0][0].data).toMatchObject({ status: "closed" });
      // 종결한 본인(요청자=작성자)은 빼고 담당자에게만 알린다.
      expect(res.notifications.map((item) => item.recipientId)).toEqual(["owner"]);
    });
  });
});
