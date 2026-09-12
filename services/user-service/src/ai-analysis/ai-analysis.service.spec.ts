import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";
import { AiAnalysisService } from "./ai-analysis.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import type { AiServiceClient } from "../ai-credentials/ai-service.client";

// 의존성 mock — 이 서비스가 실제로 호출하는 메서드만 갖춘 객체를 만들고,
// 생성자 주입 시점에만 좁은 캐스팅을 둔다(타입 전체를 흉내 낼 필요가 없다).
const createPrismaMock = () => ({
  aiAnalysis: { upsert: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
});

const memberCtx: TenantContext = { tenantId: "t1", isSystemAdmin: false };
const adminCtx: TenantContext = { isSystemAdmin: true };
const existingRow = {
  id: "a1",
  targetType: "contract",
  targetId: "c1",
  kind: "risk",
  tenantId: "t1",
  input: { text: "x" },
  triggeredByUserId: "u1",
};
const createCredentialsMock = () => ({ getDecryptedKeyFor: jest.fn() });
const createAiClientMock = () => ({ analyze: jest.fn() });

describe("AiAnalysisService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let credentials: ReturnType<typeof createCredentialsMock>;
  let aiClient: ReturnType<typeof createAiClientMock>;
  let svc: AiAnalysisService;
  beforeEach(() => {
    prisma = createPrismaMock();
    credentials = createCredentialsMock();
    aiClient = createAiClientMock();
    svc = new AiAnalysisService(
      prisma as unknown as PrismaService,
      credentials as unknown as AiCredentialsService,
      aiClient as unknown as AiServiceClient,
    );
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
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1" });
    aiClient.analyze.mockResolvedValue({ result: { risks: [] } });
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: { text: "x" } });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "a1" }, data: expect.objectContaining({ status: "succeeded", result: { risks: [] } }),
    }));
  });

  it("trigger: analyze 실패하면 failed + errorMessage + attempts 증가", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1", attempts: 0 });
    aiClient.analyze.mockRejectedValue(new Error("401 invalid key"));
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", errorMessage: expect.stringContaining("401") }),
    }));
  });

  it("trigger: 자격증명 조회가 실패해도 reject 하지 않는다(fire-and-forget 안전성)", async () => {
    credentials.getDecryptedKeyFor.mockRejectedValue(new Error("decrypt failed"));
    await expect(
      svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} }),
    ).resolves.toBeUndefined();
    expect(prisma.aiAnalysis.upsert).not.toHaveBeenCalled();
  });

  it("trigger: upsert(pending 생성)가 실패해도 reject 하지 않는다(fire-and-forget 안전성)", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockRejectedValue(new Error("db down"));
    await expect(
      svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} }),
    ).resolves.toBeUndefined();
    expect(aiClient.analyze).not.toHaveBeenCalled();
  });

  it("get: 없으면 null", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(null);
    expect(await svc.get("contract", "c1", "risk", memberCtx)).toBeNull();
  });

  it("get: 있으면 DTO 로 매핑해 반환한다", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue({
      ...existingRow,
      status: "succeeded",
      result: { risks: [] },
      errorMessage: null,
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(await svc.get("contract", "c1", "risk", memberCtx)).toEqual({
      kind: "risk",
      status: "succeeded",
      result: { risks: [] },
      errorMessage: null,
      triggeredByUserId: "u1",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("get: 조회 where 에 tenantScope 가 적용된다(타 테넌트 targetId 위조 차단)", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(null);
    // 다른 테넌트 사용자가 같은 targetId 로 조회 → tenantId 필터 때문에 행이 잡히지 않는다.
    expect(await svc.get("contract", "c1", "risk", { tenantId: "t2", isSystemAdmin: false })).toBeNull();
    expect(prisma.aiAnalysis.findFirst).toHaveBeenCalledWith({
      where: { targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t2" },
    });
  });

  it("get: 시스템 관리자는 테넌트 필터 없이 조회한다", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(null);
    await svc.get("contract", "c1", "risk", adminCtx);
    expect(prisma.aiAnalysis.findFirst).toHaveBeenCalledWith({
      where: { targetType: "contract", targetId: "c1", kind: "risk" },
    });
  });

  it("retry: 최초 트리거 주체 본인이면 기존 행 기준으로 다시 trigger 한다", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(existingRow);
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-x" });
    aiClient.analyze.mockResolvedValue({ result: {} });
    await svc.retry("contract", "c1", "risk", "u1", memberCtx);
    expect(aiClient.analyze).toHaveBeenCalled();
  });

  it("retry: 트리거 주체가 아닌 사용자는 403(타인의 API 키로 과금되는 것을 차단)", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(existingRow);
    await expect(svc.retry("contract", "c1", "risk", "attacker", memberCtx)).rejects.toBeInstanceOf(
      RpcException,
    );
    expect(credentials.getDecryptedKeyFor).not.toHaveBeenCalled();
    expect(aiClient.analyze).not.toHaveBeenCalled();
  });

  it("retry: 시스템 관리자는 트리거 주체가 아니어도 재시도할 수 있다", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(existingRow);
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-x" });
    aiClient.analyze.mockResolvedValue({ result: {} });
    await svc.retry("contract", "c1", "risk", "admin-user", adminCtx);
    expect(aiClient.analyze).toHaveBeenCalled();
  });

  it("retry: 타 테넌트 행은 조회되지 않아 아무 일도 하지 않는다", async () => {
    prisma.aiAnalysis.findFirst.mockResolvedValue(null);
    await expect(
      svc.retry("contract", "c1", "risk", "u1", { tenantId: "t2", isSystemAdmin: false }),
    ).resolves.toBeUndefined();
    expect(aiClient.analyze).not.toHaveBeenCalled();
  });
});
