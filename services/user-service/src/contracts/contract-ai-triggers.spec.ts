import { ContractAiTriggers } from "./contract-ai-triggers";
import { buildContractsModule, createContractMocks, flushAiTrigger, fullRow } from "./contracts.spec-helpers";
import { toResponse } from "./contract.mapper";

describe("ContractAiTriggers", () => {
  const mocks = createContractMocks();
  const { prismaMock, aiAnalysisMock, contractTextMock } = mocks;
  let triggers: ContractAiTriggers;

  beforeEach(async () => {
    jest.clearAllMocks();
    contractTextMock.extract.mockReset().mockResolvedValue(null);
    triggers = (await buildContractsModule(mocks, [ContractAiTriggers])).get(ContractAiTriggers);
  });

  it("triggerWithContractText: 본문 추출 결과를 payload 에 실어 백그라운드로 트리거", async () => {
    contractTextMock.extract.mockResolvedValueOnce("본문");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = toResponse(fullRow("legalReview") as any);
    triggers.triggerWithContractText({ kind: "risk", contract, tenantId: "t1", triggeredByUserId: "u9" });
    expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    await flushAiTrigger();
    expect(contractTextMock.extract).toHaveBeenCalledWith(contract.files, { ocrUserId: "u9" });
    expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "risk", targetId: "ct-1", tenantId: "t1", triggeredByUserId: "u9", payload: expect.objectContaining({ fileText: "본문" }) }),
    );
  });

  it("추출기가 실패해도(reject) fileText=null 로 그대로 트리거한다", async () => {
    contractTextMock.extract.mockRejectedValueOnce(new Error("ocr"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggers.triggerWithContractText({ kind: "precheck", contract: toResponse(fullRow("draft") as any), tenantId: "t1", triggeredByUserId: "u1" });
    await flushAiTrigger();
    expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(expect.objectContaining({ kind: "precheck", payload: expect.objectContaining({ fileText: null }) }));
  });

  it("analyzeRenewalTerms: 체결 전이면 400, 트리거 없음", async () => {
    prismaMock.contract.findFirst.mockReset().mockResolvedValueOnce(fullRow("legalReview"));
    await expect(
      triggers.analyzeRenewalTerms({ contractId: "ct-1", viewerId: "u1", tenantContext: { tenantId: "t1", isSystemAdmin: false } }),
    ).rejects.toMatchObject({ error: { status: 400 } });
    await flushAiTrigger();
    expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
  });
});
