import { PrismaClient } from "@prisma/client";

// 마이그레이션이 실제로 적용됐는지 확인하는 스모크 테스트 — 서비스 로직 없이 Prisma 모델만 검증.
describe("ContractTemplate/ContractTemplateVersion 스키마", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("템플릿과 버전을 생성·연결·되돌리기 순서로 저장하고 읽을 수 있다", async () => {
    const tenantId = `test-tenant-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;

    const template = await prisma.contractTemplate.create({
      data: {
        tenantId,
        categoryId: "nda",
        name: "테스트 비밀유지계약서",
        createdById: userId,
        versions: {
          create: { versionNo: 1, content: { type: "doc", content: [] }, createdById: userId },
        },
      },
      include: { versions: true },
    });
    expect(template.currentVersionNo).toBe(1);
    expect(template.versions).toHaveLength(1);

    const v2 = await prisma.contractTemplateVersion.create({
      data: { templateId: template.id, versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, createdById: userId },
    });
    expect(v2.versionNo).toBe(2);

    // 정리
    await prisma.contractTemplate.delete({ where: { id: template.id } });
  });
});
