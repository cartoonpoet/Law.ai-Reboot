import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentTemplatesService } from "./document-templates.service";

describe("DocumentTemplatesService", () => {
  let service: DocumentTemplatesService;
  let prisma: PrismaService;
  let tenantId: string;
  let counselId: string;
  let generalId: string;
  let ctx: { tenantId: string; isSystemAdmin: boolean };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [DocumentTemplatesService, PrismaService] }).compile();
    service = moduleRef.get(DocumentTemplatesService);
    prisma = moduleRef.get(PrismaService);

    tenantId = `tpl-tenant-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "starter", status: "active" } });
    counselId = `counsel-${Date.now()}`;
    generalId = `general-${Date.now()}`;
    await prisma.user.create({ data: { id: counselId, email: `${counselId}@test.com`, name: "사내변호사", passwordHash: "x" } });
    await prisma.user.create({ data: { id: generalId, email: `${generalId}@test.com`, name: "일반직원", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId: counselId, tenantId, role: "inHouseCounsel" } });
    await prisma.userTenant.create({ data: { userId: generalId, tenantId, role: "general" } });
    ctx = { tenantId, isSystemAdmin: false };
  });

  afterAll(async () => {
    await prisma.contractTemplate.deleteMany({ where: { tenantId } });
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { id: { in: [counselId, generalId] } } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it("일반 직원은 템플릿을 만들 수 없다(403)", async () => {
    await expect(
      service.create({ viewerId: generalId, tenantContext: ctx, categoryId: "nda", name: "테스트", content: { type: "doc" } }),
    ).rejects.toThrow(RpcException);
  });

  it("사내변호사는 템플릿을 만들고, 버전을 쌓고, 되돌릴 수 있다", async () => {
    const created = await service.create({
      viewerId: counselId,
      tenantContext: ctx,
      categoryId: "nda",
      name: "비밀유지계약서 표준",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(created.template.currentVersion.versionNo).toBe(1);

    const v2 = await service.createVersion({
      id: created.template.id,
      viewerId: counselId,
      tenantContext: ctx,
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] },
      clauseCount: 2,
    });
    expect(v2.currentVersion.versionNo).toBe(2);

    const versions = await service.listVersions({ id: created.template.id, viewerId: counselId, tenantContext: ctx });
    expect(versions.versions.map((v) => v.versionNo)).toEqual([2, 1]);

    const reverted = await service.revert({ id: created.template.id, viewerId: counselId, tenantContext: ctx, toVersionNo: 1 });
    // 되돌리기도 "새 버전 저장" — 버전 번호는 계속 올라간다(3), 이력이 지워지지 않는다.
    expect(reverted.currentVersion.versionNo).toBe(3);
    expect(reverted.currentVersion.content).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("일반 직원도 목록·상세는 볼 수 있다", async () => {
    const list = await service.list({ viewerId: generalId, tenantContext: ctx });
    expect(list.items.length).toBeGreaterThan(0);
  });

  it("다른 테넌트의 템플릿은 404로 숨긴다", async () => {
    const otherCtx = { tenantId: "other-tenant-xyz", isSystemAdmin: false };
    const list = await service.list({ viewerId: counselId, tenantContext: ctx });
    const id = list.items[0].id;
    await expect(service.get({ id, viewerId: counselId, tenantContext: otherCtx })).rejects.toThrow(RpcException);
  });
});
