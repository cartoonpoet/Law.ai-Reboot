import { AiAnalysisService } from "./ai-analysis.service";

describe("AiAnalysisService", () => {
  let prisma: any; let credentials: any; let aiClient: any; let svc: AiAnalysisService;
  beforeEach(() => {
    prisma = { aiAnalysis: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() } };
    credentials = { getDecryptedKeyFor: jest.fn() };
    aiClient = { analyze: jest.fn() };
    svc = new AiAnalysisService(prisma, credentials, aiClient);
  });

  it("trigger: 자격증명 없으면 skipped 로 upsert 하고 analyze 호출 안 함", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue(null);
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} });
    expect(prisma.aiAnalysis.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: "skipped" }),
    }));
    expect(aiClient.analyze).not.toHaveBeenCalled();
  });

  it("trigger: 자격증명 있으면 pending→(analyze 성공)succeeded 로 갱신", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1" });
    aiClient.analyze.mockResolvedValue({ result: { risks: [] } });
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: { text: "x" } });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "a1" }, data: expect.objectContaining({ status: "succeeded", result: { risks: [] } }),
    }));
  });

  it("trigger: analyze 실패하면 failed + errorMessage + attempts 증가", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1", attempts: 0 });
    aiClient.analyze.mockRejectedValue(new Error("401 invalid key"));
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", errorMessage: expect.stringContaining("401") }),
    }));
  });

  it("get: 없으면 null, 있으면 DTO 매핑", async () => {
    prisma.aiAnalysis.findUnique.mockResolvedValue(null);
    expect(await svc.get("contract", "c1", "risk")).toBeNull();
  });

  it("retry: 기존 행을 pending 으로 되돌리고 다시 trigger 한다", async () => {
    prisma.aiAnalysis.findUnique.mockResolvedValue({ id: "a1", targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", input: { text: "x" }, triggeredByUserId: "u1" });
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    aiClient.analyze.mockResolvedValue({ result: {} });
    await svc.retry("contract", "c1", "risk");
    expect(aiClient.analyze).toHaveBeenCalled();
  });
});
