import type { ApprovalLineDto } from "@lawai/contracts";
import { AdviceAnswerApprovalHandler, AdviceRequestApprovalHandler } from "./advices-approval.handler";
import type { PrismaService } from "../prisma/prisma.service";
import type { ApprovalOutcomeRegistry } from "../approvals/approval-outcome";

describe("법률자문 결재 확정 핸들러", () => {
  const prismaMock = {
    advice: { updateMany: jest.fn(), findMany: jest.fn() },
    adviceMessage: { updateMany: jest.fn() },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  };
  const registry = { register: jest.fn() } as unknown as ApprovalOutcomeRegistry;
  const line = { targetId: "a1" } as ApprovalLineDto;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.advice.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.adviceMessage.updateMany.mockResolvedValue({ count: 1 });
  });

  describe("요청 결재", () => {
    const handler = new AdviceRequestApprovalHandler(prismaMock as unknown as PrismaService, registry);

    it("승인되면 담당이 있는 자문은 검토로, 없는 자문은 접수로 넘긴다", async () => {
      await handler.onApproved(line);
      expect(prismaMock.advice.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", status: "requestApproval", ownerId: { not: null } },
        data: { status: "reviewing" },
      });
      expect(prismaMock.advice.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", status: "requestApproval", ownerId: null },
        data: { status: "received" },
      });
    });

    it("반려되면 요청 반려로 바꾼다", async () => {
      await handler.onRejected(line);
      expect(prismaMock.advice.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", status: "requestApproval" },
        data: { status: "requestRejected" },
      });
    });

    it("대기함에 관리번호와 삭제 여부를 알려준다", async () => {
      prismaMock.advice.findMany.mockResolvedValue([{ id: "a1", code: "ADV-2026-0091", deletedAt: null }]);
      await expect(handler.getTargetInfo(["a1"])).resolves.toEqual({ a1: { code: "ADV-2026-0091", isDeleted: false } });
    });
  });

  describe("회신 결재", () => {
    const handler = new AdviceAnswerApprovalHandler(prismaMock as unknown as PrismaService, registry);

    it("승인되면 결재 중이던 회신을 공개하고 회신 완료로 바꾼다", async () => {
      await handler.onApproved(line);
      expect(prismaMock.adviceMessage.updateMany).toHaveBeenCalledWith({
        where: { adviceId: "a1", state: "pendingApproval" },
        data: { state: "published" },
      });
      expect(prismaMock.advice.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", status: "answerApproval" },
        data: { status: "answered", answeredAt: expect.any(Date) },
      });
    });

    it("반려되면 회신을 반려로 남기고 다시 검토 중으로 돌린다", async () => {
      await handler.onRejected(line);
      expect(prismaMock.adviceMessage.updateMany).toHaveBeenCalledWith({
        where: { adviceId: "a1", state: "pendingApproval" },
        data: { state: "rejected" },
      });
      expect(prismaMock.advice.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", status: "answerApproval" },
        data: { status: "reviewing" },
      });
    });
  });
});
