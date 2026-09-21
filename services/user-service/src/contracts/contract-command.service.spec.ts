import { ContractAiTriggers } from "./contract-ai-triggers";
import { ContractCommandService } from "./contract-command.service";
import { buildContractsModule, createContractMocks, createReq, flushAiTrigger, fullRow, makeCtx } from "./contracts.spec-helpers";

describe("ContractCommandService", () => {
  const mocks = createContractMocks();
  const { prismaMock, auditMock, aiAnalysisMock } = mocks;
  let service: ContractCommandService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.contract.findFirst.mockReset();
    prismaMock.contract.create.mockReset();
    prismaMock.contract.update.mockReset();
    prismaMock.userTenant.findFirst.mockReset().mockResolvedValue({ role: "general", user: { departmentId: "d" } });
    service = (await buildContractsModule(mocks, [ContractCommandService, ContractAiTriggers])).get(ContractCommandService);
  });

  it("create: 잘못된 카테고리는 400, 기록은 남기지 않는다", async () => {
    prismaMock.contractCategory.findMany.mockResolvedValueOnce([]);
    await expect(service.create({ ...createReq, categoryId: "nope", ...makeCtx() })).rejects.toMatchObject({
      error: { status: 400, message: "유효하지 않은 카테고리" },
    });
    expect(prismaMock.contract.create).not.toHaveBeenCalled();
  });

  it("create: 카테고리 경로 라벨을 대>중>소 로 붙여 저장한다", async () => {
    prismaMock.contract.create.mockResolvedValueOnce(fullRow("unassigned"));
    await service.create({ ...createReq, categoryId: "cat-saas", files: [], ...makeCtx() });
    await flushAiTrigger();
    expect(prismaMock.contract.create.mock.calls[0][0].data.categoryLabel).toBe("개발/공급 > 소프트웨어 > SaaS 이용");
    expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
  });

  it("update: 수정 권한이 없으면 403 이고 아무것도 쓰지 않는다", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("legalReview"));
    await expect(service.update({ id: "ct-1", title: "x", viewerId: "stranger", ...makeCtx() })).rejects.toMatchObject({ error: { status: 403 } });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it("remove: 권한 없으면 403, signing 이면 400", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "o" });
    await expect(service.remove({ id: "ct-1", viewerId: "u1", ...makeCtx() })).rejects.toMatchObject({ error: { status: 403 } });
    prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signing"), ownerId: null });
    await expect(
      service.remove({ id: "ct-1", viewerId: "admin", tenantContext: { tenantId: "t1", isSystemAdmin: true } }),
    ).rejects.toMatchObject({ error: { status: 400 } });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });
});
