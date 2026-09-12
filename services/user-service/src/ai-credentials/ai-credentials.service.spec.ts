import { RpcException } from "@nestjs/microservices";
import { AiCredentialsService } from "./ai-credentials.service";

describe("AiCredentialsService", () => {
  let prisma: any;
  let crypto: any;
  let verifier: { verify: jest.Mock };
  let svc: AiCredentialsService;

  beforeEach(() => {
    prisma = {
      aiProviderCredential: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    crypto = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, "")),
    };
    verifier = { verify: jest.fn().mockResolvedValue(true) };
    svc = new AiCredentialsService(prisma, crypto, verifier);
  });

  it("get: 설정이 없으면 null", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue(null);
    const result = await svc.get("u1", { tenantId: "t1", isSystemAdmin: false });
    expect(result).toBeNull();
  });

  it("get: 있으면 apiKey 는 노출하지 않고 hasApiKey=true 만 반환", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue({
      provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-x)", lastVerifiedAt: new Date("2026-09-01"),
    });
    const result = await svc.get("u1", { tenantId: "t1", isSystemAdmin: false });
    expect(result).toEqual({ provider: "openai", model: "gpt-mini", hasApiKey: true, lastVerifiedAt: "2026-09-01T00:00:00.000Z" });
  });

  it("get: viewerId 없으면 401 이고 조회하지 않는다", async () => {
    await expect(
      svc.get(undefined, { tenantId: "t1", isSystemAdmin: false }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prisma.aiProviderCredential.findUnique).not.toHaveBeenCalled();
  });

  it("save: 검증 실패하면 400 이고 저장하지 않는다", async () => {
    verifier.verify.mockResolvedValue(false);
    await expect(
      svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-bad", viewerId: "u1", tenantContext: { tenantId: "t1", isSystemAdmin: false } }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prisma.aiProviderCredential.upsert).not.toHaveBeenCalled();
  });

  it("save: 검증 성공하면 암호화해서 저장", async () => {
    const result = await svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-good", viewerId: "u1", tenantContext: { tenantId: "t1", isSystemAdmin: false } });
    expect(crypto.encrypt).toHaveBeenCalledWith("sk-good");
    expect(prisma.aiProviderCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        create: expect.objectContaining({ userId: "u1", tenantId: "t1", provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-good)" }),
      }),
    );
    expect(result.hasApiKey).toBe(true);
  });

  it("save: viewerId 없으면 401", async () => {
    await expect(
      svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-x", tenantContext: { tenantId: "t1", isSystemAdmin: false } }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
