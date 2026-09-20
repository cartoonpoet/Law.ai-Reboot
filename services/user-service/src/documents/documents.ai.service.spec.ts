import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { DocumentsService } from "./documents.service";

describe("DocumentsService — AI 3종", () => {
  let service: DocumentsService;
  let credentials: { getDecryptedKeyFor: jest.Mock };
  let aiClient: { chat: jest.Mock };
  let tenantId: string;
  let userId: string;
  let ctx: { tenantId: string; isSystemAdmin: boolean };

  beforeAll(async () => {
    credentials = { getDecryptedKeyFor: jest.fn() };
    aiClient = { chat: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        { provide: AiCredentialsService, useValue: credentials },
        { provide: AiServiceClient, useValue: aiClient },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
    const prisma = moduleRef.get(PrismaService);

    tenantId = `ai-doc-tenant-${Date.now()}`;
    userId = `ai-doc-user-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "starter", status: "active" } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.com`, name: "테스터", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId, tenantId, role: "general" } });
    ctx = { tenantId, isSystemAdmin: false };
  });

  afterAll(async () => {
    const prisma = (service as unknown as { prisma: PrismaService }).prisma;
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it("AI 키가 없으면 needsSetup:true를 준다(3종 공통)", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue(null);
    expect(await service.aiDraft({ viewerId: userId, tenantContext: ctx, request: "NDA 초안" })).toEqual({ html: "", needsSetup: true });
    expect(await service.aiRewrite({ viewerId: userId, tenantContext: ctx, selectedText: "문장", instruction: "다듬어줘" })).toEqual({
      rewrittenText: "",
      needsSetup: true,
    });
    expect(await service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" })).toEqual({
      findings: [],
      needsSetup: true,
    });
  });

  it("aiDraft — 정상 응답을 HTML로 돌려준다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({ content: "<h1>비밀유지계약서</h1>" });
    const res = await service.aiDraft({ viewerId: userId, tenantContext: ctx, request: "비밀유지계약서 초안" });
    expect(res).toEqual({ html: "<h1>비밀유지계약서</h1>", needsSetup: false });
  });

  it("aiReview — JSON 응답을 findings로 파싱한다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({
      content: JSON.stringify({ findings: [{ severity: "danger", kind: "위험 조항", title: "제목", where: "제1조", note: "설명" }] }),
    });
    const res = await service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" });
    expect(res.findings).toHaveLength(1);
    expect(res.needsSetup).toBe(false);
  });

  it("aiReview — JSON이 아니면 502", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({ content: "JSON 아님" });
    await expect(service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" })).rejects.toThrow(RpcException);
  });

  it("aiReview — 너무 긴 HTML은 전체 거부 대신 앞부분만 잘라 AI에 보낸다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({ content: JSON.stringify({ findings: [] }) });
    const longHtml = "<p>가</p>".repeat(30_000); // 120,000자 — 게이트웨이 한도는 통과하지만 그대로 AI에 보내면 과함

    await service.aiReview({ viewerId: userId, tenantContext: ctx, html: longHtml });

    const lastCall = aiClient.chat.mock.calls[aiClient.chat.mock.calls.length - 1][0];
    const sentContent = lastCall.messages[0].content as string;
    expect(sentContent.length).toBeLessThan(longHtml.length);
    expect(sentContent).toContain("이하 생략");
  });
});
