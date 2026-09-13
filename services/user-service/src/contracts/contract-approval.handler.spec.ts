import type { ApprovalLineDto } from "@lawai/contracts";
import { ContractApprovalOutcomeHandler } from "./contract-approval.handler";
import { ApprovalOutcomeRegistry } from "../approvals/approval-outcome";

const line = (over: Partial<ApprovalLineDto> = {}): ApprovalLineDto => ({
  id: "L1",
  targetType: "contract",
  targetId: "ct-1",
  title: "계약",
  status: "rejected",
  submittedById: "u1",
  submittedByName: "한지원",
  submittedAt: "2026-09-11T01:00:00.000Z",
  decidedAt: "2026-09-12T01:00:00.000Z",
  steps: [],
  currentStepId: null,
  ...over,
});

describe("ContractApprovalOutcomeHandler", () => {
  let prisma: { contract: { updateMany: jest.Mock } };
  let registry: ApprovalOutcomeRegistry;
  let handler: ContractApprovalOutcomeHandler;

  beforeEach(() => {
    prisma = { contract: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    registry = new ApprovalOutcomeRegistry();
    handler = new ContractApprovalOutcomeHandler(prisma as never, registry);
  });

  it("onModuleInit 에서 registry 에 contract 핸들러로 등록된다", () => {
    handler.onModuleInit();
    expect(registry.get("contract")).toBe(handler);
  });

  it("onRejected: signing 상태의 계약을 reviewDone 으로 되돌린다", async () => {
    await handler.onRejected(line());
    expect(prisma.contract.updateMany).toHaveBeenCalledWith({
      where: { id: "ct-1", status: "signing" },
      data: { status: "reviewDone" },
    });
  });

  it("onApproved: 계약 상태를 변경하지 않는다(signing 유지)", async () => {
    await handler.onApproved();
    expect(prisma.contract.updateMany).not.toHaveBeenCalled();
  });
});
