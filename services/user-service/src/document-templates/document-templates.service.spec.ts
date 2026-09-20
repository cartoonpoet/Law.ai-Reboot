import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentTemplatesService } from "./document-templates.service";

describe("DocumentTemplatesService", () => {
  let service: DocumentTemplatesService;

  const prismaMock = {
    contractTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    contractTemplateVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userTenant: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };

  const tenantId = "tpl-tenant-1";
  const counselId = "counsel-1";
  const generalId = "general-1";
  const ctx = { tenantId, isSystemAdmin: false };
  const ROLES: Record<string, string> = { [counselId]: "inHouseCounsel", [generalId]: "general" };

  const expectRpcStatus = async (promise: Promise<unknown>, status: number) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toMatchObject({ status });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // 소속 확인(requireMember)·관리 권한 확인(requireCanManage)이 공유하는 모킹.
    // 다른 테넌트로 조회하면(where.tenantId 불일치) 멤버십을 찾지 못한 것으로 취급한다.
    prismaMock.userTenant.findFirst.mockImplementation(({ where }: { where: { userId: string; tenantId: string } }) => {
      if (where.tenantId !== tenantId) return Promise.resolve(null);
      return Promise.resolve(ROLES[where.userId] ? { id: `m-${where.userId}`, role: ROLES[where.userId] } : null);
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: counselId, name: "사내변호사" },
      { id: generalId, name: "일반직원" },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [DocumentTemplatesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(DocumentTemplatesService);
  });

  it("일반 직원은 템플릿을 만들 수 없다(403)", async () => {
    await expectRpcStatus(
      service.create({ viewerId: generalId, tenantContext: ctx, categoryId: "nda", name: "테스트", content: { type: "doc" } }),
      403,
    );
    expect(prismaMock.contractTemplate.create).not.toHaveBeenCalled();
  });

  it("사내변호사는 템플릿을 만들고, 버전을 쌓고, 되돌릴 수 있다", async () => {
    const templateId = "tpl-1";
    const baseFields = {
      id: templateId,
      tenantId,
      categoryId: "nda",
      name: "비밀유지계약서 표준",
      createdById: counselId,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
      deletedAt: null,
    };
    const v1 = { versionNo: 1, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: counselId, createdAt: new Date("2026-09-01T00:00:00Z") };
    const v2 = { versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] }, clauseCount: 2, createdById: counselId, createdAt: new Date("2026-09-02T00:00:00Z") };
    const v3 = { versionNo: 3, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: counselId, createdAt: new Date("2026-09-03T00:00:00Z") };

    // service.create(...) → contractTemplate.create(include: versions latest 1)
    prismaMock.contractTemplate.create.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 1, versions: [v1] });

    const created = await service.create({
      viewerId: counselId,
      tenantContext: ctx,
      categoryId: "nda",
      name: "비밀유지계약서 표준",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(created.template.currentVersion.versionNo).toBe(1);

    // service.createVersion(...) → findVisible(findFirst, no include) → $transaction([version.create, template.update]) → findTemplateWithLatest(findFirst, include)
    prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 1 });
    prismaMock.contractTemplateVersion.create.mockResolvedValueOnce(v2);
    prismaMock.contractTemplate.update.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 2 });
    prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 2, versions: [v2] });

    const createdVersion = await service.createVersion({
      id: created.template.id,
      viewerId: counselId,
      tenantContext: ctx,
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] },
      clauseCount: 2,
    });
    expect(createdVersion.currentVersion.versionNo).toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.contractTemplateVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ templateId, versionNo: 2, clauseCount: 2, createdById: counselId }) }),
    );

    // service.listVersions(...) → findVisible → contractTemplateVersion.findMany
    prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 2 });
    prismaMock.contractTemplateVersion.findMany.mockResolvedValueOnce([v2, v1]);

    const versions = await service.listVersions({ id: created.template.id, viewerId: counselId, tenantContext: ctx });
    expect(versions.versions.map((v) => v.versionNo)).toEqual([2, 1]);

    // service.revert(toVersionNo: 1) → findVisible → contractTemplateVersion.findUnique(옛 버전) → $transaction([version.create, template.update]) → findTemplateWithLatest
    prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 2 });
    prismaMock.contractTemplateVersion.findUnique.mockResolvedValueOnce(v1);
    prismaMock.contractTemplateVersion.create.mockResolvedValueOnce(v3);
    prismaMock.contractTemplate.update.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 3 });
    prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({ ...baseFields, currentVersionNo: 3, versions: [v3] });

    const reverted = await service.revert({ id: created.template.id, viewerId: counselId, tenantContext: ctx, toVersionNo: 1 });
    // 되돌리기도 "새 버전 저장" — 버전 번호는 계속 올라간다(3), 이력이 지워지지 않는다.
    expect(reverted.currentVersion.versionNo).toBe(3);
    expect(reverted.currentVersion.content).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(prismaMock.contractTemplateVersion.findUnique).toHaveBeenCalledWith({
      where: { templateId_versionNo: { templateId, versionNo: 1 } },
    });
  });

  it("일반 직원도 목록·상세는 볼 수 있다", async () => {
    prismaMock.contractTemplate.findMany.mockResolvedValueOnce([
      {
        id: "tpl-1",
        categoryId: "nda",
        name: "비밀유지계약서 표준",
        currentVersionNo: 3,
        createdById: counselId,
        createdAt: new Date("2026-09-01T00:00:00Z"),
        updatedAt: new Date("2026-09-03T00:00:00Z"),
      },
    ]);
    prismaMock.contractTemplate.groupBy.mockResolvedValueOnce([{ categoryId: "nda", _count: { _all: 1 } }]);

    const list = await service.list({ viewerId: generalId, tenantContext: ctx });
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.counts.nda).toBe(1);
  });

  it("다른 테넌트의 템플릿은 접근을 거절한다", async () => {
    const otherCtx = { tenantId: "other-tenant-xyz", isSystemAdmin: false };
    await expectRpcStatus(service.get({ id: "tpl-1", viewerId: counselId, tenantContext: otherCtx }), 403);
    // 소속 확인에서 이미 막혀야 하고, 굳이 템플릿 조회까지 가면 안 된다.
    expect(prismaMock.contractTemplate.findFirst).not.toHaveBeenCalled();
  });
});
