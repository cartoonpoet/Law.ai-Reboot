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
  approvers: [
    { name: "손준호", dept: "법무팀", type: "draft" },
    { name: "이법무", dept: "법무팀", type: "approve" },
  ],
  files: [
    { role: "contract", name: "계약서.docx", meta: "DOCX · 1.2MB", sortOrder: 0 },
    { role: "ref", name: "참고.pdf", meta: "PDF · 0.3MB", sortOrder: 0 },
  ],
  references: [
    { ccType: "user", isSecret: false, refId: "u1", name: "김참조" },
    { ccType: "dept", isSecret: false, refId: "d1", name: "법무팀" },
    { ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
  ],
};

describe("ContractsService", () => {
  let service: ContractsService;
  const prismaMock = {
    contract: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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
      code: "C20260621-1234",
      title: createReq.title,
      status: "unassigned",
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
      approvalLines: [
        {
          id: "line-1",
          contractId: "ct-1",
          status: "pending",
          createdAt: new Date("2026-06-21T00:00:00.000Z"),
          steps: [
            { id: "st-1", lineId: "line-1", stepOrder: 0, name: "손준호", dept: "법무팀", type: "draft", status: "pending" },
            { id: "st-2", lineId: "line-1", stepOrder: 1, name: "이법무", dept: "법무팀", type: "approve", status: "pending" },
          ],
        },
      ],
      files: [
        { id: "f-1", contractId: "ct-1", role: "contract", name: "계약서.docx", meta: "DOCX · 1.2MB", size: null, mimeType: null, storageKey: null, sortOrder: 0, createdAt: new Date("2026-06-21T00:00:00.000Z") },
        { id: "f-2", contractId: "ct-1", role: "ref", name: "참고.pdf", meta: "PDF · 0.3MB", size: null, mimeType: null, storageKey: null, sortOrder: 0, createdAt: new Date("2026-06-21T00:00:00.000Z") },
      ],
      references: [
        { id: "r-1", contractId: "ct-1", ccType: "user", isSecret: false, refId: "u1", name: "김참조", createdAt: new Date("2026-06-21T00:00:00.000Z") },
        { id: "r-2", contractId: "ct-1", ccType: "user", isSecret: true, refId: "u9", name: "비밀임원", createdAt: new Date("2026-06-21T00:00:00.000Z") },
        { id: "r-3", contractId: "ct-1", ccType: "dept", isSecret: false, refId: "d1", name: "법무팀", createdAt: new Date("2026-06-21T00:00:00.000Z") },
      ],
    });

    const result = await service.create(createReq);

    const arg = prismaMock.contract.create.mock.calls[0][0];
    expect(arg.data.code).toMatch(/^C\d{8}-\d{4}$/); // 관리번호 생성
    expect(result.code).toBe("C20260621-1234");
    expect(result.status).toBe("unassigned");
    expect(arg.data.periodStart).toEqual(new Date("2026-07-01"));
    expect(arg.data.periodEnd).toBeNull(); // "" → null
    expect(arg.data.counterparties.create).toHaveLength(1);
    // 결재선: approvers 를 배열 순서대로 단계화
    expect(arg.data.approvalLines.create.steps.create).toEqual([
      { stepOrder: 0, name: "손준호", dept: "법무팀", type: "draft" },
      { stepOrder: 1, name: "이법무", dept: "법무팀", type: "approve" },
    ]);
    expect(result.id).toBe("ct-1");
    expect(result.periodStart).toBe("2026-07-01T00:00:00.000Z");
    expect(result.counterparties[0].snapshot.name).toBe("삼성전자(주)");
    expect(result.approvalLine?.steps).toHaveLength(2);
    expect(result.approvalLine?.steps[1].type).toBe("approve");
    // 첨부: role+name+sortOrder 로 생성, size/mimeType/storageKey 는 미전송(메타 행)
    expect(arg.data.files.create).toEqual([
      { role: "contract", name: "계약서.docx", meta: "DOCX · 1.2MB", sortOrder: 0 },
      { role: "ref", name: "참고.pdf", meta: "PDF · 0.3MB", sortOrder: 0 },
    ]);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].role).toBe("contract");
    expect(result.files[0].storageKey).toBeNull();
    // 참조수신자: ccType+isSecret 으로 생성
    expect(arg.data.references.create).toEqual([
      { ccType: "user", isSecret: false, refId: "u1", name: "김참조" },
      { ccType: "dept", isSecret: false, refId: "d1", name: "법무팀" },
      { ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
    ]);
    expect(result.references).toHaveLength(3);
    expect(result.references.find((r) => r.isSecret)?.name).toBe("비밀임원");
  });

  it("get은 deletedAt null 조건으로 조회하고 없으면 404 RpcException", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(service.get({ id: "missing" })).rejects.toBeInstanceOf(
      RpcException,
    );
    expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "missing", deletedAt: null },
      include: {
        counterparties: true,
        approvalLines: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
        files: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
        references: { orderBy: [{ ccType: "asc" }, { isSecret: "asc" }] },
      },
    });
  });

  it("list는 deletedAt null + 필터/페이지네이션으로 요약 행을 반환한다", async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      {
        id: "ct-1",
        code: "C20260621-0001",
        title: "계약 A",
        status: "legalReview",
        securityLevel: "secure",
        party: "본사계약",
        catSub: "용역",
        requesterId: "jhson1",
        ownerId: null,
        dueDate: new Date("2026-07-01T00:00:00.000Z"),
        createdById: "user-uuid-1",
        updatedAt: new Date("2026-06-21T00:00:00.000Z"),
        counterparties: [{ snapshot: companySnapshot }],
      },
    ]);
    prismaMock.contract.count.mockResolvedValue(1);

    const res = await service.list({ q: "계약", status: "legalReview", page: 1, pageSize: 20 });

    const findArg = prismaMock.contract.findMany.mock.calls[0][0];
    expect(findArg.where.deletedAt).toBeNull();
    expect(findArg.where.status).toBe("legalReview");
    expect(findArg.where.OR).toBeDefined(); // q 검색
    expect(findArg.skip).toBe(0);
    expect(findArg.take).toBe(20);
    expect(res.total).toBe(1);
    expect(res.items[0].code).toBe("C20260621-0001");
    expect(res.items[0].counterpartyName).toBe("삼성전자(주)");
    expect(res.items[0].dueDate).toBe("2026-07-01T00:00:00.000Z");
  });

  // toResponse 가 요구하는 관계 배열을 포함한 최소 행
  const fullRow = (status: string) => ({
    id: "ct-1",
    code: "C20260621-0001",
    title: "계약",
    status,
    securityLevel: "secure",
    reviewType: "normal",
    party: null,
    catMajor: null,
    catMinor: null,
    catSub: null,
    requesterId: null,
    ownerId: null,
    createdById: "u1",
    periodStart: null,
    periodEnd: null,
    dueDate: null,
    schemaVersion: 1,
    details: detailsV1,
    deletedAt: null,
    createdAt: new Date("2026-06-21T00:00:00.000Z"),
    updatedAt: new Date("2026-06-21T00:00:00.000Z"),
    counterparties: [],
    approvalLines: [],
    files: [],
    references: [],
  });

  it("updateStatus는 허용된 전이를 적용한다 (legalReview→reviewDone)", async () => {
    prismaMock.contract.findFirst.mockResolvedValue({ id: "ct-1", status: "legalReview" });
    prismaMock.contract.update.mockResolvedValue(fullRow("reviewDone"));
    const res = await service.updateStatus({ id: "ct-1", status: "reviewDone" });
    expect(prismaMock.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ct-1" }, data: expect.objectContaining({ status: "reviewDone" }) }),
    );
    expect(res.status).toBe("reviewDone");
  });

  it("updateStatus는 허용되지 않은 전이를 400으로 막는다 (unassigned→signed)", async () => {
    prismaMock.contract.findFirst.mockResolvedValue({ id: "ct-1", status: "unassigned" });
    await expect(
      service.updateStatus({ id: "ct-1", status: "signed" }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("update는 제공된 필드만 갱신하고 날짜를 파싱한다", async () => {
    prismaMock.contract.findFirst.mockResolvedValue({ id: "ct-1", status: "unassigned" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({ id: "ct-1", title: "수정됨", dueDate: "2026-08-01" });
    const arg = prismaMock.contract.update.mock.calls[0][0];
    expect(arg.data.title).toBe("수정됨");
    expect(arg.data.dueDate).toEqual(new Date("2026-08-01"));
    expect(arg.data.securityLevel).toBeUndefined(); // 미제공 필드는 건드리지 않음
  });

  it("update는 없는 계약이면 404", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(
      service.update({ id: "missing", title: "x" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  // 마스킹 검증용: 비밀 참조자 + PII 있는 상대회사
  const rowWithSecrets = () => ({
    ...fullRow("legalReview"),
    createdById: "creator-1",
    ownerId: "owner-1",
    counterparties: [
      {
        id: "cp-1",
        companyId: "comp-1",
        partyType: null,
        snapshot: { ...companySnapshot, bizNo: "124-81-00998", managerPhone: "010-1234-5678", managerEmail: "a@law.ai", phone: "02-111-2222" },
      },
    ],
    references: [
      { id: "r-1", ccType: "user", isSecret: false, refId: "u1", name: "공개참조" },
      { id: "r-2", ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
    ],
  });

  it("get: 생성자는 비밀참조·PII 원문을 본다", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    const res = await service.get({ id: "ct-1", viewerId: "creator-1" });
    expect(res.references).toHaveLength(2);
    expect(res.counterparties[0].snapshot.bizNo).toBe("124-81-00998");
    expect(res.counterparties[0].snapshot.managerEmail).toBe("a@law.ai");
  });

  it("get: 권한 없는 조회자는 비밀참조 숨김 + PII 마스킹", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    const res = await service.get({ id: "ct-1", viewerId: "stranger" });
    expect(res.references).toHaveLength(1);
    expect(res.references[0].isSecret).toBe(false);
    expect(res.counterparties[0].snapshot.bizNo).toBe("124-**-*****");
    expect(res.counterparties[0].snapshot.managerEmail).toBe("a***@law.ai");
    expect(res.counterparties[0].snapshot.managerPhone).toBe("010-****-****");
  });
});
