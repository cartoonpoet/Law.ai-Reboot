import { ContractAiTriggers } from "./contract-ai-triggers";
import { ContractLifecycleService } from "./contract-lifecycle.service";
import { buildContractsModule, createContractMocks, fullRow, makeCtx } from "./contracts.spec-helpers";

describe("ContractLifecycleService", () => {
  const mocks = createContractMocks();
  const { prismaMock, auditMock, statusEventsMock, approvalsMock } = mocks;
  let service: ContractLifecycleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.contract.findFirst.mockReset();
    prismaMock.contract.update.mockReset();
    prismaMock.userTenant.findFirst.mockReset().mockResolvedValue({ role: "general", user: { departmentId: "d" } });
    approvalsMock.getActive.mockReset().mockResolvedValue({ line: null, historyCount: 0 });
    service = (await buildContractsModule(mocks, [ContractLifecycleService, ContractAiTriggers])).get(ContractLifecycleService);
  });

  it("updateStatus: signed 로의 직접 전이는 400 — 체결 처리 기능 전용", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("signing"));
    await expect(service.updateStatus({ id: "ct-1", status: "signed", viewerId: "u1", ...makeCtx() })).rejects.toMatchObject({
      error: { status: 400 },
    });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("updateStatus: 전이맵에 없는 전이는 400(reviewDone→signing)", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "d" } });
    prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("reviewDone"), ownerId: "a" });
    await expect(service.updateStatus({ id: "ct-1", status: "signing", viewerId: "a", ...makeCtx() })).rejects.toMatchObject({
      error: { status: 400 },
    });
  });

  it("terminate: 체결 전 계약은 400 이고 부수효과가 없다", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("legalReview"));
    await expect(
      service.terminate({ contractId: "ct-1", viewerId: "u1", terminatedOn: "2026-09-30", reason: "other", fileId: "f", ...makeCtx() }),
    ).rejects.toMatchObject({ error: { status: 400 } });
    expect(auditMock.record).not.toHaveBeenCalled();
    expect(statusEventsMock.record).not.toHaveBeenCalled();
  });

  it("finalizeRegistration: 생성자가 아니면 403", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("unassigned"), createdById: "creator" });
    await expect(
      service.finalizeRegistration({ contractId: "ct-1", viewerId: "other", signedAt: "2026-09-16", ...makeCtx() }),
    ).rejects.toMatchObject({ error: { status: 403 } });
  });
});
