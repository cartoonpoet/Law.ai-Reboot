import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { ContractsService } from "./contracts.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateContractRequest } from "@lawai/contracts";

const companySnapshot = {
  id: "comp-1",
  type: "company" as const,
  name: "삼성전자(주)",
  bizNo: "124-81-00998",
  ceo: "한종희",
  phone: null,
  address: null,
  addressDetail: null,
  managerName: null,
  managerPhone: null,
  managerEmail: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const detailsV1 = {
  stage: "new" as const,
  periodText: "",
  periodManual: false,
  noEndDate: false,
  lang: "ko" as const,
  legal: "" as const,
  negotiation: 50,
  money: [{ vat: "excluded" as const, amount: 1000, currency: "KRW" }],
  moneyNote: "",
  payTerms: "",
  purpose: "목적",
  keyPoints: "",
  concerns: "",
  urls: [],
  ccUsers: [],
  ccDepts: [],
  ccSecret: [],
  owner: null,
  project: null,
  relatedDocs: [],
  approvers: [{ name: "손준호", dept: "법무팀", type: "draft" as const }],
  contractFiles: [{ name: "계약서.docx", meta: "DOCX · 1.2MB" }],
  attachFiles: [],
  refFiles: [],
};

const createReq: CreateContractRequest = {
  title: "테스트 계약",
  securityLevel: "secure",
  reviewType: "normal",
  party: "개발/공급",
  catMajor: "개발/공급",
  catMinor: "소프트웨어",
  catSub: "SaaS 이용",
  requesterId: "jhson1",
  ownerId: null,
  createdById: "user-uuid-1",
  periodStart: "2026-07-01",
  periodEnd: "",
  dueDate: "",
  schemaVersion: 1,
  details: detailsV1,
  counterparties: [{ companyId: "comp-1", snapshot: companySnapshot }],
};

describe("ContractsService", () => {
  let service: ContractsService;
  const prismaMock = {
    contract: { create: jest.fn(), findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(ContractsService);
  });

  it("create는 코어 컬럼·details·counterparties를 저장하고 날짜를 파싱한다", async () => {
    prismaMock.contract.create.mockResolvedValue({
      id: "ct-1",
      title: createReq.title,
      securityLevel: "secure",
      reviewType: "normal",
      party: createReq.party,
      catMajor: createReq.catMajor,
      catMinor: createReq.catMinor,
      catSub: createReq.catSub,
      requesterId: "jhson1",
      ownerId: null,
      createdById: "user-uuid-1",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: null,
      dueDate: null,
      schemaVersion: 1,
      details: detailsV1,
      deletedAt: null,
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
      updatedAt: new Date("2026-06-21T00:00:00.000Z"),
      counterparties: [
        {
          id: "cp-1",
          contractId: "ct-1",
          companyId: "comp-1",
          partyType: null,
          snapshot: companySnapshot,
          createdAt: new Date("2026-06-21T00:00:00.000Z"),
        },
      ],
    });

    const result = await service.create(createReq);

    const arg = prismaMock.contract.create.mock.calls[0][0];
    expect(arg.data.periodStart).toEqual(new Date("2026-07-01"));
    expect(arg.data.periodEnd).toBeNull(); // "" → null
    expect(arg.data.counterparties.create).toHaveLength(1);
    expect(result.id).toBe("ct-1");
    expect(result.periodStart).toBe("2026-07-01T00:00:00.000Z");
    expect(result.counterparties[0].snapshot.name).toBe("삼성전자(주)");
  });

  it("get은 deletedAt null 조건으로 조회하고 없으면 404 RpcException", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(service.get({ id: "missing" })).rejects.toBeInstanceOf(
      RpcException,
    );
    expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "missing", deletedAt: null },
      include: { counterparties: true },
    });
  });
});
