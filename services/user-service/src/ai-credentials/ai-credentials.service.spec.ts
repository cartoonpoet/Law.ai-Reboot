import { RpcException } from "@nestjs/microservices";
import { AiCredentialsService, type CryptoPort } from "./ai-credentials.service";
import type { PrismaService } from "../prisma/prisma.service";

// 의존성 mock — 이 서비스가 실제로 호출하는 메서드만 갖춘 객체를 만들고,
// 생성자 주입 시점에만 좁은 캐스팅을 둔다(타입 전체를 흉내 낼 필요가 없다).
const createPrismaMock = () => ({
  aiProviderCredential: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});
const createCryptoMock = () => ({
  encrypt: jest.fn((v: string) => `enc(${v})`),
  decrypt: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, "")),
});

describe("AiCredentialsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let crypto: ReturnType<typeof createCryptoMock>;
  let verifier: { verify: jest.Mock };
  let svc: AiCredentialsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    crypto = createCryptoMock();
    verifier = { verify: jest.fn().mockResolvedValue(true) };
    svc = new AiCredentialsService(prisma as unknown as PrismaService, crypto as CryptoPort, verifier);
  });

  it("get: 설정이 없으면 null", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue(null);
    const result = await svc.get("u1");
    expect(result).toBeNull();
  });

  it("get: 있으면 apiKey 는 노출하지 않고 hasApiKey=true 만 반환", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue({
      provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-x)", lastVerifiedAt: new Date("2026-09-01"),
    });
    const result = await svc.get("u1");
    expect(result).toEqual({ provider: "openai", model: "gpt-mini", hasApiKey: true, lastVerifiedAt: "2026-09-01T00:00:00.000Z" });
  });

  it("get: viewerId 없으면 401 이고 조회하지 않는다", async () => {
    await expect(
      svc.get(undefined),
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

  it("getDecryptedKeyFor: 자격증명이 없으면 null", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue(null);
    const result = await svc.getDecryptedKeyFor("u1");
    expect(result).toBeNull();
  });

  it("getDecryptedKeyFor: 있으면 복호화한 apiKey 를 포함해 반환", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue({
      provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-x)",
    });
    const result = await svc.getDecryptedKeyFor("u1");
    expect(crypto.decrypt).toHaveBeenCalledWith("enc(sk-x)");
    expect(result).toEqual({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
  });
});
