import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { DocumentsService } from "./documents.service";

describe("DocumentsService", () => {
  let service: DocumentsService;
  const tenantId = "doc-tenant-1";
  const userId = "doc-user-1";
  const ctx = { tenantId, isSystemAdmin: false };

  const prismaMock = {
    userTenant: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // userId 는 tenantId 소속, 그 밖의 테넌트는 소속 없음.
    prismaMock.userTenant.findFirst.mockImplementation(({ where }: { where: { userId: string; tenantId: string } }) =>
      Promise.resolve(where.userId === userId && where.tenantId === tenantId ? { id: "m-1", role: "general" } : null),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AiCredentialsService, useValue: { getDecryptedKeyFor: jest.fn() } },
        { provide: AiServiceClient, useValue: { chat: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
  });

  it("Tiptap JSON을 .docx base64로 내보낸다", async () => {
    const res = await service.export({
      viewerId: userId,
      tenantContext: ctx,
      fileName: "테스트계약서",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }] },
    });
    expect(res.fileName).toBe("테스트계약서.docx");
    expect(res.base64.length).toBeGreaterThan(0);
  });

  it("내보낸 .docx를 다시 들여오면 텍스트가 보존된다(라운드트립)", async () => {
    const exported = await service.export({
      viewerId: userId,
      tenantContext: ctx,
      fileName: "라운드트립",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "라운드트립 확인용 문장" }] }] },
    });
    const imported = await service.import({ viewerId: userId, tenantContext: ctx, base64: exported.base64, fileName: "라운드트립.docx" });
    expect(imported.html).toContain("라운드트립 확인용 문장");
  });

  it("빈 파일은 400으로 거부한다", async () => {
    await expect(service.import({ viewerId: userId, tenantContext: ctx, base64: "", fileName: "빈파일.docx" })).rejects.toThrow(
      RpcException,
    );
  });

  it("회사 구성원이 아니면 403", async () => {
    const otherCtx = { tenantId: "no-such-tenant", isSystemAdmin: false };
    await expect(
      service.export({ viewerId: userId, tenantContext: otherCtx, fileName: "x", content: { type: "doc", content: [] } }),
    ).rejects.toThrow(RpcException);
    expect(prismaMock.userTenant.findFirst).toHaveBeenCalledWith({ where: { userId, tenantId: "no-such-tenant" } });
  });
});
