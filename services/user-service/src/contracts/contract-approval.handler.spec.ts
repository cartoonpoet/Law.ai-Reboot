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
  let prisma: { contract: { updateMany: jest.Mock; findMany: jest.Mock } };
  let registry: ApprovalOutcomeRegistry;
  let handler: ContractApprovalOutcomeHandler;

  beforeEach(() => {
    prisma = {
      contract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
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

  it("getTargetCodes: 계약 id 로 관리번호를 찾아 id → code 로 돌려준다", async () => {
    prisma.contract.findMany.mockResolvedValue([
      { id: "ct-1", code: "C20260908-0142" },
      { id: "ct-2", code: "C20260902-0077" },
    ]);
    await expect(handler.getTargetCodes(["ct-1", "ct-2"])).resolves.toEqual({
      "ct-1": "C20260908-0142",
      "ct-2": "C20260902-0077",
    });
    expect(prisma.contract.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["ct-1", "ct-2"] } },
      select: { id: true, code: true },
    });
  });

  it("getTargetCodes: 빈 목록이면 조회하지 않는다", async () => {
    await expect(handler.getTargetCodes([])).resolves.toEqual({});
    expect(prisma.contract.findMany).not.toHaveBeenCalled();
  });
});
