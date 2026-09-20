import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "./documents.service";

describe("DocumentsService", () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let tenantId: string;
  let userId: string;
  let ctx: { tenantId: string; isSystemAdmin: boolean };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [DocumentsService, PrismaService] }).compile();
    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);

    tenantId = `doc-tenant-${Date.now()}`;
    userId = `doc-user-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "starter", status: "active" } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.com`, name: "테스터", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId, tenantId, role: "general" } });
    ctx = { tenantId, isSystemAdmin: false };
  });

  afterAll(async () => {
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
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
  });
});
