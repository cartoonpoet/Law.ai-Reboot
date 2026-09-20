import { PrismaClient } from "@prisma/client";

// 마이그레이션이 실제로 적용됐는지 확인하던 스모크 테스트 — CI에 Postgres 서비스가 없어
// 진짜 DB 대신 PrismaClient 자체를 모킹해, 생성·연결·되돌리기 저장 시 넘기는 데이터 모양(스키마 형태)을
// 검증한다. 서비스 로직은 없음(Prisma 모델 호출 계약만 확인).
const contractTemplate = { create: jest.fn(), delete: jest.fn() };
const contractTemplateVersion = { create: jest.fn() };
const disconnect = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    contractTemplate,
    contractTemplateVersion,
    $disconnect: disconnect,
  })),
}));

describe("ContractTemplate/ContractTemplateVersion 스키마", () => {
  const prisma = new PrismaClient() as unknown as {
    contractTemplate: typeof contractTemplate;
    contractTemplateVersion: typeof contractTemplateVersion;
    $disconnect: typeof disconnect;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("템플릿과 버전을 생성·연결·되돌리기 순서로 저장하고 읽을 수 있다", async () => {
    const tenantId = `test-tenant-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;

    prisma.contractTemplate.create.mockResolvedValueOnce({
      id: "tpl-1",
      tenantId,
      categoryId: "nda",
      name: "테스트 비밀유지계약서",
      createdById: userId,
      currentVersionNo: 1,
      versions: [{ id: "v1", versionNo: 1, content: { type: "doc", content: [] }, createdById: userId }],
    });

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
    expect(prisma.contractTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          categoryId: "nda",
          versions: { create: { versionNo: 1, content: { type: "doc", content: [] }, createdById: userId } },
        }),
      }),
    );
    expect(template.currentVersionNo).toBe(1);
    expect(template.versions).toHaveLength(1);

    prisma.contractTemplateVersion.create.mockResolvedValueOnce({
      id: "v2",
      templateId: template.id,
      versionNo: 2,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      createdById: userId,
    });

    const v2 = await prisma.contractTemplateVersion.create({
      data: { templateId: template.id, versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, createdById: userId },
    });
    expect(v2.versionNo).toBe(2);
    expect(prisma.contractTemplateVersion.create).toHaveBeenCalledWith({
      data: { templateId: template.id, versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, createdById: userId },
    });

    // 정리
    prisma.contractTemplate.delete.mockResolvedValueOnce({ id: template.id });
    await prisma.contractTemplate.delete({ where: { id: template.id } });
    expect(prisma.contractTemplate.delete).toHaveBeenCalledWith({ where: { id: template.id } });
  });
});
