import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";
import { ApprovalsService } from "./approvals.service";
import type { SubmitApprovalInput } from "./approvals.service";
import { ApprovalOutcomeRegistry } from "./approval-outcome";

const ctx: TenantContext = {
  tenantId: "T1",
  role: "general",
} as unknown as TenantContext;

const step = (
  order: number,
  over: Partial<Record<string, unknown>> = {},
) => ({
  id: `S${order}`,
  lineId: "L1",
  stepOrder: order,
  userId: `u${order}`,
  name: `이름${order}`,
  dept: "부서",
  type: "approve",
  status: "pending",
  comment: null,
  decidedAt: null,
  ...over,
});

const makeLine = (
  steps: ReturnType<typeof step>[],
  over: Partial<Record<string, unknown>> = {},
) => ({
  id: "L1",
  targetType: "contract",
  targetId: "C1",
  title: "테스트 계약",
  status: "pending",
  tenantId: "T1",
  submittedById: "u-req",
  submittedAt: new Date("2026-09-11T01:00:00Z"),
  decidedAt: null,
  createdAt: new Date("2026-09-11T01:00:00Z"),
  submittedBy: { id: "u-req", name: "한지원" },
  steps,
  ...over,
});

describe("ApprovalsService", () => {
  let prisma: {
    approvalLine: Record<string, jest.Mock>;
    approvalStep: Record<string, jest.Mock>;
  };
  let noti: { createMany: jest.Mock };
  let registry: ApprovalOutcomeRegistry;
  let svc: ApprovalsService;

  const notiTypes = (): [string, string][] =>
    (noti.createMany.mock.calls[0][0] as { type: string; recipientId: string }[]).map(
      (n) => [n.type, n.recipientId],
    );

  beforeEach(() => {
    prisma = {
      approvalLine: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      approvalStep: {
        update: jest.fn(),
      },
    };
    noti = { createMany: jest.fn().mockResolvedValue([]) };
    registry = new ApprovalOutcomeRegistry();
    svc = new ApprovalsService(
      prisma as never,
      noti as never,
      registry,
    );
  });

  describe("submit", () => {
    it("라인 생성 — draft 즉시 approved, 첫 차례 approval_turn + refer approval_referred 알림", async () => {
      prisma.approvalLine.create.mockResolvedValue(
        makeLine([
          step(0, { id: "S0", userId: "u-req", type: "draft", status: "approved" }),
          step(1, { id: "S1", userId: "u1" }),
          step(2, { id: "S2", userId: "u-ref", type: "refer" }),
        ]),
      );
      const input: SubmitApprovalInput = {
        targetType: "contract",
        targetId: "C1",
        title: "테스트 계약",
        submittedById: "u-req",
        tenantId: "T1",
        steps: [
          { userId: "u-req", name: "한지원", dept: "사업개발팀", type: "draft" },
          { userId: "u1", name: "이름1", dept: "부서", type: "approve" },
          { userId: "u-ref", name: "참조자", dept: "부서", type: "refer" },
        ],
      };
      const result = await svc.submit(input);
      expect(result.line.currentStepId).toBe("S1");
      expect(notiTypes()).toContainEqual(["approval_turn", "u1"]);
      expect(notiTypes()).toContainEqual(["approval_referred", "u-ref"]);
      // draft 스텝은 생성 시점부터 approved 로 만든다.
      const createArg = prisma.approvalLine.create.mock.calls[0][0];
      expect(createArg.data.steps.create[0].status).toBe("approved");
      expect(createArg.data.steps.create[1].status).toBe("pending");
    });
  });

  describe("decide", () => {
    it("내 차례가 아니면 403", async () => {
      prisma.approvalLine.findUnique.mockResolvedValue(
        makeLine([step(0), step(1)]),
      );
      await expect(
        svc.decide({ lineId: "L1", decision: "approve", viewerId: "u1", tenantContext: ctx }),
      ).rejects.toMatchObject({ error: { status: 403 } });
    });

    it("확정된 라인이면 400", async () => {
      prisma.approvalLine.findUnique.mockResolvedValue(
        makeLine([step(0, { status: "approved" })], { status: "approved" }),
      );
      await expect(
        svc.decide({ lineId: "L1", decision: "approve", viewerId: "u0", tenantContext: ctx }),
      ).rejects.toMatchObject({ error: { status: 400 } });
    });

    it("없는 라인이면 404", async () => {
      prisma.approvalLine.findUnique.mockResolvedValue(null);
      await expect(
        svc.decide({ lineId: "missing", decision: "approve", viewerId: "u0", tenantContext: ctx }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("승인: 다음 차례에게 approval_turn, 라인 pending 유지", async () => {
      prisma.approvalLine.findUnique
        .mockResolvedValueOnce(makeLine([step(0), step(1)]))
        .mockResolvedValueOnce(
          makeLine([step(0, { status: "approved" }), step(1)]),
        );
      prisma.approvalStep.update.mockResolvedValue(step(0, { status: "approved" }));
      const result = await svc.decide({
        lineId: "L1",
        decision: "approve",
        comment: "확인",
        viewerId: "u0",
        tenantContext: ctx,
      });
      expect(result.line.status).toBe("pending");
      expect(result.line.currentStepId).toBe("S1");
      expect(notiTypes()).toContainEqual(["approval_turn", "u1"]);
      expect(prisma.approvalLine.update).not.toHaveBeenCalled();
    });

    it("마지막 승인: 라인 approved + onApproved + 상신자 approval_completed", async () => {
      const onApproved = jest.fn().mockResolvedValue(undefined);
      registry.register({ targetType: "contract", onApproved, onRejected: jest.fn(), getTargetInfo: jest.fn() });
      prisma.approvalLine.findUnique
        .mockResolvedValueOnce(
          makeLine([
            step(0, { status: "approved" }),
            step(1),
            step(2, { type: "refer", userId: "u-ref" }),
          ]),
        )
        .mockResolvedValueOnce(
          makeLine(
            [
              step(0, { status: "approved" }),
              step(1, { status: "approved" }),
              step(2, { type: "refer", userId: "u-ref" }),
            ],
            { status: "approved", decidedAt: new Date() },
          ),
        );
      prisma.approvalStep.update.mockResolvedValue(step(1, { status: "approved" }));
      prisma.approvalLine.update.mockResolvedValue(makeLine([], { status: "approved" }));
      const result = await svc.decide({
        lineId: "L1",
        decision: "approve",
        viewerId: "u1",
        tenantContext: ctx,
      });
      expect(result.line.status).toBe("approved");
      expect(onApproved).toHaveBeenCalled();
      expect(notiTypes()).toContainEqual(["approval_completed", "u-req"]);
    });

    it("반려: 라인 rejected + onRejected + 상신자 approval_rejected", async () => {
      const onRejected = jest.fn().mockResolvedValue(undefined);
      registry.register({ targetType: "contract", onApproved: jest.fn(), onRejected, getTargetInfo: jest.fn() });
      prisma.approvalLine.findUnique
        .mockResolvedValueOnce(makeLine([step(0)]))
        .mockResolvedValueOnce(
          makeLine([step(0, { status: "rejected" })], {
            status: "rejected",
            decidedAt: new Date(),
          }),
        );
      prisma.approvalStep.update.mockResolvedValue(step(0, { status: "rejected" }));
      prisma.approvalLine.update.mockResolvedValue(makeLine([], { status: "rejected" }));
      const result = await svc.decide({
        lineId: "L1",
        decision: "reject",
        comment: "예산 초과",
        viewerId: "u0",
        tenantContext: ctx,
      });
      expect(result.line.status).toBe("rejected");
      expect(onRejected).toHaveBeenCalledWith(expect.anything(), "S0");
      expect(notiTypes()).toContainEqual(["approval_rejected", "u-req"]);
    });
  });

  describe("inbox", () => {
    it("내 차례(pending)와 처리한 결재(processed)를 나눠 반환", async () => {
      prisma.approvalLine.findMany
        .mockResolvedValueOnce([
          makeLine([step(0, { userId: "me" }), step(1)]),
        ])
        .mockResolvedValueOnce([
          makeLine(
            [step(0, { userId: "me", status: "approved", decidedAt: new Date() })],
            { id: "L2", status: "approved" },
          ),
        ]);
      const res = await svc.inbox({ viewerId: "me", tenantContext: ctx });
      expect(res.pending).toHaveLength(1);
      expect(res.pending[0].myStepOrder).toBe(0);
      expect(res.pending[0].totalSteps).toBe(2);
      expect(res.processed).toHaveLength(1);
    });

    it("내 스텝이 있어도 앞 단계가 pending 이면 pending 목록에 없음", async () => {
      prisma.approvalLine.findMany
        .mockResolvedValueOnce([makeLine([step(0), step(1, { userId: "me" })])])
        .mockResolvedValueOnce([]);
      const res = await svc.inbox({ viewerId: "me", tenantContext: ctx });
      expect(res.pending).toHaveLength(0);
    });

    it("앞 단계가 진행 중이고 내 단계가 남아 있으면 upcoming(내 차례 예정)에 넣는다", async () => {
      prisma.approvalLine.findMany
        .mockResolvedValueOnce([
          makeLine([step(0), step(1, { userId: "me" })], { id: "L-up" }),
          makeLine([step(0, { userId: "me" }), step(1)], { id: "L-now" }),
          // 참조로만 들어간 라인은 예정이 아니다
          makeLine([step(0), step(1, { userId: "me", type: "refer" })], { id: "L-refer" }),
        ])
        .mockResolvedValueOnce([]);
      const res = await svc.inbox({ viewerId: "me", tenantContext: ctx });
      expect(res.pending.map((i) => i.lineId)).toEqual(["L-now"]);
      expect(res.upcoming.map((i) => i.lineId)).toEqual(["L-up"]);
      expect(res.upcoming[0].myStepOrder).toBe(1);
    });

    it("대상 도메인 핸들러에서 문서 번호·삭제 여부를 받아 채운다(핸들러 없으면 번호 null, 삭제 아님)", async () => {
      const getTargetInfo = jest.fn().mockResolvedValue({ C1: { code: "C20260908-0142", isDeleted: false } });
      registry.register({ targetType: "contract", onApproved: jest.fn(), onRejected: jest.fn(), getTargetInfo });
      prisma.approvalLine.findMany
        .mockResolvedValueOnce([
          makeLine([step(0, { userId: "me" })]),
          makeLine([step(0, { userId: "me" })], { id: "L-advice", targetType: "advice", targetId: "A1" }),
        ])
        .mockResolvedValueOnce([]);
      const res = await svc.inbox({ viewerId: "me", tenantContext: ctx });
      expect(getTargetInfo).toHaveBeenCalledWith(["C1"]);
      expect(res.pending.map((i) => [i.lineId, i.targetCode, i.isTargetDeleted])).toEqual([
        ["L1", "C20260908-0142", false],
        ["L-advice", null, false],
      ]);
    });

    it("삭제된 계약의 결재는 목록에 남기되 삭제됨으로 표시한다", async () => {
      const getTargetInfo = jest.fn().mockResolvedValue({ C1: { code: "C20260908-0142", isDeleted: true } });
      registry.register({ targetType: "contract", onApproved: jest.fn(), onRejected: jest.fn(), getTargetInfo });
      prisma.approvalLine.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeLine([step(0, { userId: "me", status: "approved", decidedAt: new Date() })])]);
      const res = await svc.inbox({ viewerId: "me", tenantContext: ctx });
      expect(res.processed.map((i) => [i.lineId, i.isTargetDeleted])).toEqual([["L1", true]]);
    });
  });

  describe("getActive", () => {
    it("최신 라인과 이전 라인 수를 반환", async () => {
      prisma.approvalLine.findFirst.mockResolvedValue(makeLine([step(0)]));
      prisma.approvalLine.count.mockResolvedValue(3);
      const res = await svc.getActive("contract", "C1");
      expect(res.line?.id).toBe("L1");
      expect(res.historyCount).toBe(2);
    });

    it("결재자 프로필 사진은 현재 사진 키를 이미지 경로로 바꿔 주고, 사진·사용자 연결이 없으면 null", async () => {
      prisma.approvalLine.findFirst.mockResolvedValue(
        makeLine([
          step(0, { user: { avatarKey: "avatars/u0/face.png" } }),
          step(1, { user: { avatarKey: null } }),
          step(2, { userId: null, user: null }),
        ]),
      );
      prisma.approvalLine.count.mockResolvedValue(1);
      const res = await svc.getActive("contract", "C1");
      expect(res.line?.steps.map((s) => s.avatarUrl)).toEqual(["/users/u0/avatar/face.png", null, null]);
      // R2 키 자체는 응답에 싣지 않는다.
      expect(JSON.stringify(res.line)).not.toContain("avatars/u0");
    });

    it("라인이 없으면 null + 0", async () => {
      prisma.approvalLine.findFirst.mockResolvedValue(null);
      prisma.approvalLine.count.mockResolvedValue(0);
      const res = await svc.getActive("contract", "C1");
      expect(res.line).toBeNull();
      expect(res.historyCount).toBe(0);
    });
  });
});
