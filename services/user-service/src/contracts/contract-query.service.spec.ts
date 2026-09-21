import { ContractQueryService } from "./contract-query.service";
import { buildContractsModule, createContractMocks, fullRow, makeCtx } from "./contracts.spec-helpers";

describe("ContractQueryService", () => {
  const mocks = createContractMocks();
  const { prismaMock } = mocks;
  let service: ContractQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.contract.findFirst.mockReset();
    prismaMock.userTenant.findFirst.mockReset().mockResolvedValue({ role: "general", user: { departmentId: "d" } });
    prismaMock.$transaction.mockReset().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    service = (await buildContractsModule(mocks, [ContractQueryService])).get(ContractQueryService);
  });

  it("get: 없으면 404, 삭제된 계약은 볼 권한이 있으면 '삭제된 계약입니다'", async () => {
    prismaMock.contract.findFirst.mockResolvedValueOnce(null);
    await expect(service.get({ id: "x", ...makeCtx() })).rejects.toMatchObject({ error: { status: 404 } });

    prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signed"), deletedAt: new Date() });
    await expect(service.get({ id: "ct-1", viewerId: "u1", ...makeCtx() })).rejects.toMatchObject({
      error: { status: 404, message: "삭제된 계약입니다" },
    });
  });

  it("list: 페이지 크기를 1~100 으로 조이고 모든 상태의 건수 키를 0 으로 채운다", async () => {
    prismaMock.contract.findMany.mockResolvedValueOnce([]);
    prismaMock.contract.count.mockResolvedValueOnce(0);
    prismaMock.contract.groupBy.mockResolvedValueOnce([{ status: "signed", _count: { _all: 3 } }]);
    const res = await service.list({ page: 0, pageSize: 999, ...makeCtx() });
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(100);
    expect(res.counts.signed).toBe(3);
    expect(res.counts.draft).toBe(0);
    expect(Object.keys(res.counts)).toHaveLength(10);
  });
});
