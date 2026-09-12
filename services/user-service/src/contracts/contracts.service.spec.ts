import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { ContractsService } from "./contracts.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./contracts.audit";
import { R2Client } from "../files/r2.client";
import { ApprovalsService } from "../approvals/approvals.service";
import { AiAnalysisService } from "../ai-analysis/ai-analysis.service";
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
  categoryId: null,
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

// 헬퍼: tenantContext 를 포함한 최소 컨텍스트 생성 (Task 8: 테넌트 격리)
const makeCtx = (tenantId = "t1") => ({
  tenantContext: { tenantId, isSystemAdmin: false } as const,
});

describe("ContractsService", () => {
  let service: ContractsService;
  // resolveCategoryLabel 이 메모리에서 부모 체인을 추적하는 데 쓰는 시드 트리(대>중>소).
  const categoryTree = [
    { id: "cat-major", name: "개발/공급", parentId: null },
    { id: "cat-minor", name: "소프트웨어", parentId: "cat-major" },
    { id: "cat-saas", name: "SaaS 이용", parentId: "cat-minor" },
  ];
  const prismaMock = {
    contract: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    contractCategory: {
      findMany: jest.fn(() => Promise.resolve(categoryTree)),
    },
    // create 시엔 { departmentId } 만 사용(creator 부서 조회).
    // loadViewer admin 분기(isSystemAdmin=true)에서 { id, departmentId } 조회.
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: "default-id",
        departmentId: "dept-1",
      }),
    },
    // Task 10: viewer role 공급원 — 활성 테넌트 UserTenant.role.
    // 기본 role=general 로 viewer 를 구성(개별 테스트가 필요 시 mockResolvedValueOnce 로 덮음).
    userTenant: {
      findFirst: jest.fn().mockResolvedValue({
        role: "general",
        user: { departmentId: "dept-1" },
      }),
    },
    // contract update 의 파일 GC 가 삭제 대상 storageKey 를 미리 조회할 때 사용.
    file: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined) };
  // R2 객체 정리(best-effort) — contract update 의 파일 제거 시 호출 검증용.
  const r2Mock = {
    deleteObjects: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
  // 결재 모듈 mock — get(활성 라인)·상신 경로에서 사용.
  const approvalsMock = {
    submit: jest.fn(),
    getActive: jest.fn().mockResolvedValue({ line: null, historyCount: 0 }),
  };
  // AI 분석 잡 트리거 — fire-and-forget 호출이므로 트리거 여부/인자만 검증.
  const aiAnalysisMock = { trigger: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    r2Mock.deleteObjects.mockResolvedValue(undefined);
    r2Mock.deleteObject.mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
        { provide: R2Client, useValue: r2Mock },
        { provide: ApprovalsService, useValue: approvalsMock },
        { provide: AiAnalysisService, useValue: aiAnalysisMock },
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
      categoryId: null,
      categoryLabel: null,
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

    const result = await service.create({ ...createReq, ...makeCtx() });

    const arg = prismaMock.contract.create.mock.calls[0][0];
    expect(arg.data.code).toMatch(/^C\d{8}-\d{4}$/); // 관리번호 생성
    expect(result.code).toBe("C20260621-1234");
    expect(result.status).toBe("unassigned");
    expect(arg.data.periodStart).toEqual(new Date("2026-07-01"));
    expect(arg.data.periodEnd).toBeNull(); // "" → null
    expect(arg.data.counterparties.create).toHaveLength(1);
    // 결재선(상신 전): 라인을 만들지 않고 details.approvers 로만 보관.
    expect(arg.data.approvalLines).toBeUndefined();
    expect(arg.data.details.approvers).toEqual([
      { name: "손준호", dept: "법무팀", type: "draft" },
      { name: "이법무", dept: "법무팀", type: "approve" },
    ]);
    expect(result.id).toBe("ct-1");
    expect(result.periodStart).toBe("2026-07-01T00:00:00.000Z");
    expect(result.counterparties[0].snapshot.name).toBe("삼성전자(주)");
    expect(result.approvalLine).toBeNull();
    // 첨부: role+name+sortOrder+tenantId 로 생성, size/mimeType/storageKey 는 미전송(메타 행)
    expect(arg.data.files.create).toEqual([
      { tenantId: "t1", role: "contract", name: "계약서.docx", meta: "DOCX · 1.2MB", sortOrder: 0 },
      { tenantId: "t1", role: "ref", name: "참고.pdf", meta: "PDF · 0.3MB", sortOrder: 0 },
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

  it("create: 계약서(role=contract) 파일이 있으면 precheck AI 분석을 트리거한다", async () => {
    prismaMock.contract.create.mockResolvedValue({
      ...fullRow("unassigned"),
      id: "ct-1",
      createdById: "user-uuid-1",
    });
    await service.create({ ...createReq, ...makeCtx() });
    expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "contract",
        targetId: "ct-1",
        kind: "precheck",
        triggeredByUserId: "user-uuid-1",
      }),
    );
  });

  it("create: 계약서(role=contract) 파일이 없으면 precheck AI 분석을 트리거하지 않는다", async () => {
    prismaMock.contract.create.mockResolvedValue({
      ...fullRow("unassigned"),
      id: "ct-2",
      createdById: "user-uuid-1",
    });
    await service.create({
      ...createReq,
      ...makeCtx(),
      files: [{ role: "ref", name: "참고.pdf", meta: "PDF · 0.3MB", sortOrder: 0 }],
    });
    expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
  });

  it("get은 deletedAt null 조건으로 조회하고 없으면 404 RpcException", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(service.get({ id: "missing", ...makeCtx() })).rejects.toBeInstanceOf(
      RpcException,
    );
    expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "missing", deletedAt: null, tenantId: "t1" },
      include: {
        requester: { select: { name: true } },
        owner: { select: { name: true } },
        counterparties: true,
        files: {
          where: { commentId: null },
          orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
        },
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
        categoryLabel: "개발/공급 > 용역",
        requesterId: "jhson1",
        requester: { name: "손준호" },
        ownerId: null,
        owner: null,
        dueDate: new Date("2026-07-01T00:00:00.000Z"),
        createdById: "user-uuid-1",
        updatedAt: new Date("2026-06-21T00:00:00.000Z"),
        counterparties: [{ snapshot: companySnapshot }],
      },
    ]);
    prismaMock.contract.count.mockResolvedValue(1);

    const res = await service.list({ q: "계약", status: "legalReview", page: 1, pageSize: 20, ...makeCtx() });

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
    // toSummary 가 categoryLabel(전체 경로)을 노출한다.
    expect(res.items[0].categoryLabel).toBe("개발/공급 > 용역");
    // toSummary 가 requester/owner 관계의 실명을 노출한다(없으면 null).
    expect(res.items[0].requesterName).toBe("손준호");
    expect(res.items[0].ownerName).toBeNull();
  });

  it("list ?categoryId= 는 categoryId 정확 일치 where 조건을 적용한다", async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);
    prismaMock.contract.count.mockResolvedValue(0);

    await service.list({ categoryId: "cat-saas", page: 1, pageSize: 20, ...makeCtx() });

    const findArg = prismaMock.contract.findMany.mock.calls[0][0];
    expect(findArg.where.categoryId).toBe("cat-saas");
    const countArg = prismaMock.contract.count.mock.calls[0][0];
    expect(countArg.where.categoryId).toBe("cat-saas");
  });

  it("list categoryId 미지정 시 where 에 categoryId 조건이 없다", async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);
    prismaMock.contract.count.mockResolvedValue(0);

    await service.list({ page: 1, pageSize: 20, ...makeCtx() });

    const findArg = prismaMock.contract.findMany.mock.calls[0][0];
    expect(findArg.where.categoryId).toBeUndefined();
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
    categoryId: null,
    categoryLabel: null,
    requesterId: null,
    ownerId: null,
    createdById: "u1",
    tenantId: "t1",
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
    // 권한 통과: viewer 를 inHouseCounsel(담당 건 transition 가능)으로 구성 — ownerId 일치 필요.
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("legalReview"), status: "legalReview", ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("reviewDone"));
    const res = await service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "admin-1", ...makeCtx() });
    expect(prismaMock.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "ct-1", tenantId: "t1" }), data: expect.objectContaining({ status: "reviewDone" }) }),
    );
    expect(res.status).toBe("reviewDone");
  });

  it("updateStatus: legalReview 진입 시 risk AI 분석을 트리거한다", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), status: "unassigned", ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue({ ...fullRow("legalReview"), ownerId: "admin-1" });
    await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "admin-1", ...makeCtx() });
    expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "contract", targetId: "ct-1", kind: "risk", triggeredByUserId: "admin-1" }),
    );
  });

  it("updateStatus: legalReview 진입해도 ownerId 가 없으면 AI 분석을 트리거하지 않는다", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), status: "unassigned", ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue({ ...fullRow("legalReview"), ownerId: null });
    await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "admin-1", ...makeCtx() });
    expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
  });

  it("updateStatus: reviewDone 진입 시 submitBriefing AI 분석을 트리거한다", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("legalReview"), status: "legalReview", ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue({ ...fullRow("reviewDone"), createdById: "creator-1" });
    await service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "admin-1", ...makeCtx() });
    expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "contract", targetId: "ct-1", kind: "submitBriefing", triggeredByUserId: "creator-1" }),
    );
  });

  it("updateStatus는 허용되지 않은 전이를 400으로 막는다 (unassigned→signed)", async () => {
    // 역할(canTransition)은 통과(inHouseCounsel as owner)하되 ALLOWED_TRANSITIONS 위반으로 400.
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), status: "unassigned", ownerId: "admin-1" });
    await expect(
      service.updateStatus({ id: "ct-1", status: "signed", viewerId: "admin-1", ...makeCtx() }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("update는 제공된 필드만 갱신하고 날짜를 파싱한다", async () => {
    // 권한 통과: viewer 를 inHouseCounsel(담당 건 edit 가능) as owner 로 구성.
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({ id: "ct-1", title: "수정됨", dueDate: "2026-08-01", viewerId: "admin-1", ...makeCtx() });
    const arg = prismaMock.contract.update.mock.calls[0][0];
    expect(arg.data.title).toBe("수정됨");
    expect(arg.data.dueDate).toEqual(new Date("2026-08-01"));
    expect(arg.data.securityLevel).toBeUndefined(); // 미제공 필드는 건드리지 않음
  });

  it("update는 없는 계약이면 404", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(
      service.update({ id: "missing", title: "x", viewerId: "admin-1", ...makeCtx() }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("update는 제공된 관계를 deleteMany+create로 전체 교체한다", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({
      id: "ct-1",
      viewerId: "admin-1",
      ...makeCtx(),
      files: [{ role: "contract", name: "new.docx", meta: "DOCX", sortOrder: 0 }],
      references: [{ ccType: "dept", isSecret: false, refId: "d2", name: "운영팀" }],
      approvers: [],
    });
    const arg = prismaMock.contract.update.mock.calls[0][0];
    // 코멘트 첨부 보호: deleteMany 가 commentId:null 만 노리고, keepIds 가 없으면 그 외 추가 필터 없음.
    expect(arg.data.files.deleteMany).toEqual({ commentId: null });
    expect(arg.data.files.create).toHaveLength(1);
    expect(arg.data.files.update).toEqual([]);
    expect(arg.data.references.create[0].name).toBe("운영팀");
    // 빈 approvers → details.approvers 를 빈 배열로 갱신(라인 조작 없음)
    expect(arg.data.approvalLines).toBeUndefined();
    expect(arg.data.details.approvers).toEqual([]);
    // 미제공 관계(counterparties)는 건드리지 않음
    expect(arg.data.counterparties).toBeUndefined();
  });

  // spec §6: risk 는 "legalReview 진입 또는 계약서 파일 교체 시" 트리거된다.
  describe("update: 계약서 파일 교체 시 risk 재분석", () => {
    // 검토 중(legalReview)이고 계약서 본문 파일 f1 이 이미 붙어 있는 계약.
    const rowInReview = () => ({
      ...fullRow("legalReview"),
      status: "legalReview",
      ownerId: "admin-1",
      files: [{ id: "f1", role: "contract" }],
    });

    beforeEach(() => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    });

    it("legalReview 중 계약서 파일을 새 파일로 교체하면 risk 를 다시 트리거한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(rowInReview());
      prismaMock.contract.update.mockResolvedValue(rowInReview());
      await service.update({
        id: "ct-1",
        viewerId: "admin-1",
        ...makeCtx(),
        // 기존 f1 을 빼고 새 계약서를 올림 → 교체.
        files: [{ role: "contract", name: "revised.docx", meta: "DOCX", sortOrder: 0 }],
      });
      expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: "contract", targetId: "ct-1", kind: "risk", triggeredByUserId: "admin-1" }),
      );
    });

    it("risk 대상이 아닌 상태(unassigned)에서는 파일을 교체해도 트리거하지 않는다", async () => {
      const row = { ...rowInReview(), status: "unassigned" };
      prismaMock.contract.findFirst.mockResolvedValue(row);
      prismaMock.contract.update.mockResolvedValue(row);
      await service.update({
        id: "ct-1",
        viewerId: "admin-1",
        ...makeCtx(),
        files: [{ role: "contract", name: "revised.docx", meta: "DOCX", sortOrder: 0 }],
      });
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    it("파일을 건드리지 않는 수정(제목 등)은 트리거하지 않는다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(rowInReview());
      prismaMock.contract.update.mockResolvedValue(rowInReview());
      await service.update({ id: "ct-1", title: "제목만 수정", viewerId: "admin-1", ...makeCtx() });
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    it("계약서 파일은 그대로 두고 참고자료만 추가하면 트리거하지 않는다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(rowInReview());
      prismaMock.contract.update.mockResolvedValue(rowInReview());
      await service.update({
        id: "ct-1",
        viewerId: "admin-1",
        ...makeCtx(),
        // f1(계약서)은 유지, role=ref 참고자료만 신규 추가.
        files: [
          { id: "f1", role: "contract", name: "original.docx", meta: "DOCX", sortOrder: 0 },
          { role: "ref", name: "참고.pdf", meta: "PDF", sortOrder: 1 },
        ],
      });
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    it("담당자(owner) 미배정이면 파일을 교체해도 트리거하지 않는다", async () => {
      const row = { ...rowInReview(), ownerId: null };
      prismaMock.contract.findFirst.mockResolvedValue(rowInReview());
      prismaMock.contract.update.mockResolvedValue(row);
      await service.update({
        id: "ct-1",
        viewerId: "admin-1",
        ...makeCtx(),
        files: [{ role: "contract", name: "revised.docx", meta: "DOCX", sortOrder: 0 }],
      });
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });
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
    const res = await service.get({ id: "ct-1", viewerId: "creator-1", ...makeCtx() });
    expect(res.references).toHaveLength(2);
    expect(res.counterparties[0].snapshot.bizNo).toBe("124-81-00998");
    expect(res.counterparties[0].snapshot.managerEmail).toBe("a@law.ai");
  });

  it("get: 관련은 있으나 비특권 조회자(cc general)는 비밀참조 숨김 + PII 마스킹", async () => {
    // cc(refId:"u1") 에 든 general → canView=true, 비특권 → maskSecret=true.
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "general", user: { departmentId: "dept-9" } });
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    const res = await service.get({ id: "ct-1", viewerId: "u1", ...makeCtx() });
    expect(res.references).toHaveLength(1);
    expect(res.references[0].isSecret).toBe(false);
    expect(res.counterparties[0].snapshot.bizNo).toBe("124-**-*****");
    expect(res.counterparties[0].snapshot.managerEmail).toBe("a***@law.ai");
    expect(res.counterparties[0].snapshot.managerPhone).toBe("010-****-****");
  });

  it("get: 완전 비관련 general 조회자는 404 (존재 노출 방지)", async () => {
    // 테넌트 멤버가 아닌 stranger → userTenant.findFirst = null → viewer=null → canView=false → 404.
    prismaMock.userTenant.findFirst.mockResolvedValueOnce(null);
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    await expect(
      service.get({ id: "ct-1", viewerId: "stranger", ...makeCtx() }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("get: 응답에 can 4필드(edit/assign/transition/delete)를 부착한다", async () => {
    // inHouseCounsel 담당자 → edit/assign/transition=true, delete=false(TenantRole 기준).
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    // viewer("owner-1")가 ownerId 와 일치해야 requiresOwner 통과.
    prismaMock.contract.findFirst.mockResolvedValue({ ...rowWithSecrets(), ownerId: "owner-1" });
    const res = await service.get({ id: "ct-1", viewerId: "owner-1", ...makeCtx() });
    expect(res.can).toEqual({ edit: true, assign: true, transition: true, delete: false });
  });

  // --- Gen-Phase 8: 가드 / 감사 케이스 ---

  it("update: canEdit=false 면 403 (권한 없는 general)", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "general", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue(fullRow("unassigned"));
    await expect(
      service.update({ id: "ct-1", title: "x", viewerId: "g-1", ...makeCtx() }),
    ).rejects.toMatchObject({ error: { status: 403 } });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("updateStatus: canTransition=false 면 403 (권한 없는 general)", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "general", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("legalReview"), status: "legalReview" });
    await expect(
      service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "g-1", ...makeCtx() }),
    ).rejects.toMatchObject({ error: { status: 403 } });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("updateStatus: 역할 통과 + 전이맵 위반 → 400", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("legalReview"), status: "legalReview", ownerId: "admin-1" });
    await expect(
      service.updateStatus({ id: "ct-1", status: "signed", viewerId: "admin-1", ...makeCtx() }),
    ).rejects.toMatchObject({ error: { status: 400 } });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  // Task 3 fix round(I4): updateStatus 는 결재 완료를 검증하지 않으므로, sealManager 가
  // signing 상태에서 이 경로로 곧장 "signed" 를 요청하면 completeSigning 의 결재 완료
  // 게이트를 완전히 우회할 수 있었다(canTransition 이 signing 에서 항상 true 이기 때문).
  // status==="signed" 는 역할/전이맵과 무관하게 여기서 차단되어야 한다.
  it("updateStatus: sealManager 라도 signed 로의 직접 전이는 차단된다 (completeSigning 우회 방지, 400)", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "sealManager", user: { departmentId: null } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("signing"), status: "signing" });
    await expect(
      service.updateStatus({ id: "ct-1", status: "signed", viewerId: "u-seal", ...makeCtx() }),
    ).rejects.toMatchObject({
      error: { status: 400, message: "체결 처리는 체결 처리 기능을 사용하세요" },
    });
    expect(prismaMock.contract.update).not.toHaveBeenCalled();
  });

  it("get: top/secure 등급 조회 시 audit.record(view) 호출", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    // securityLevel: "secure" (fullRow 기본) — inHouseCounsel: view="all" → canView=true.
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    await service.get({ id: "ct-1", viewerId: "admin-1", ...makeCtx() });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "view",
        targetType: "Contract",
        targetId: "ct-1",
        actorId: "admin-1",
        detail: { securityLevel: "secure" },
      }),
    );
  });

  it("get: normal 등급 조회 시 audit.record(view) 미호출", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({
      ...rowWithSecrets(),
      securityLevel: "normal",
    });
    await service.get({ id: "ct-1", viewerId: "admin-1", ...makeCtx() });
    const viewCalls = auditMock.record.mock.calls.filter(
      (c) => c[0]?.action === "view",
    );
    expect(viewCalls).toHaveLength(0);
  });

  it("create: 성공 시 audit.record(create) 호출", async () => {
    prismaMock.contract.create.mockResolvedValue({
      ...fullRow("unassigned"),
      id: "ct-new",
      createdById: "user-uuid-1",
    });
    await service.create({ ...createReq, ...makeCtx() });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        targetType: "Contract",
        targetId: "ct-new",
        actorId: "user-uuid-1",
      }),
    );
  });

  it("create: audit.record 에 tenantId 가 기록된다", async () => {
    prismaMock.contract.create.mockResolvedValue({
      ...fullRow("unassigned"),
      id: "ct-new",
      createdById: "user-uuid-1",
    });
    await service.create({ ...createReq, ...makeCtx() });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1" }),
    );
  });

  it("update: 성공 시 audit.record(update) 호출", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({ id: "ct-1", title: "수정됨", viewerId: "admin-1", ...makeCtx() });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        targetType: "Contract",
        targetId: "ct-1",
        actorId: "admin-1",
      }),
    );
  });

  it("updateStatus: 전이 성공 시 audit.record(transition) 호출", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("legalReview"), status: "legalReview", ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("reviewDone"));
    await service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "admin-1", ...makeCtx() });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "transition",
        targetType: "Contract",
        targetId: "ct-1",
        actorId: "admin-1",
        detail: { from: "legalReview", to: "reviewDone" },
      }),
    );
  });

  // --- Gen-Phase 8: 분류(categoryId/categoryLabel) read/write 행위 검증 ---

  describe("분류 categoryId/categoryLabel", () => {
    it("create: categoryId 저장 + resolveCategoryLabel 로 전체 경로 categoryLabel 산출 저장", async () => {
      prismaMock.contract.create.mockResolvedValue({
        ...fullRow("unassigned"),
        id: "ct-new",
        categoryId: "cat-saas",
        categoryLabel: "개발/공급 > 소프트웨어 > SaaS 이용",
      });

      const result = await service.create({ ...createReq, categoryId: "cat-saas", ...makeCtx() });

      const data = prismaMock.contract.create.mock.calls[0][0].data;
      expect(data.categoryId).toBe("cat-saas");
      // 소분류 id → 대>중>소 전체 경로 스냅샷.
      expect(data.categoryLabel).toBe("개발/공급 > 소프트웨어 > SaaS 이용");
      // 트리는 메모리 1회 로드로 부모 체인 추적.
      expect(prismaMock.contractCategory.findMany).toHaveBeenCalled();
      expect(result.categoryId).toBe("cat-saas");
      expect(result.categoryLabel).toBe("개발/공급 > 소프트웨어 > SaaS 이용");
    });

    it("create: categoryId 가 루트면 categoryLabel 은 루트명 단독", async () => {
      prismaMock.contract.create.mockResolvedValue({
        ...fullRow("unassigned"),
        id: "ct-root",
        categoryId: "cat-major",
        categoryLabel: "개발/공급",
      });
      await service.create({ ...createReq, categoryId: "cat-major", ...makeCtx() });
      const data = prismaMock.contract.create.mock.calls[0][0].data;
      expect(data.categoryId).toBe("cat-major");
      expect(data.categoryLabel).toBe("개발/공급");
    });

    it("create: categoryId null 이면 categoryLabel null (트리 조회 없음)", async () => {
      prismaMock.contract.create.mockResolvedValue({
        ...fullRow("unassigned"),
        id: "ct-none",
        categoryId: null,
        categoryLabel: null,
      });
      await service.create({ ...createReq, categoryId: null, ...makeCtx() });
      const data = prismaMock.contract.create.mock.calls[0][0].data;
      expect(data.categoryId).toBeNull();
      expect(data.categoryLabel).toBeNull();
      expect(prismaMock.contractCategory.findMany).not.toHaveBeenCalled();
    });

    it("create: 존재하지 않는 categoryId(트리에 없음)면 400 RpcException (소유 검증 실패)", async () => {
      // findMany 가 빈 배열 반환 → 체인 0건 → label null → 400 throw.
      prismaMock.contractCategory.findMany.mockResolvedValueOnce([]);
      await expect(
        service.create({ ...createReq, categoryId: "no-such-id", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 400, message: "유효하지 않은 카테고리" } });
      // contract.create 는 호출되지 않아야 한다 (검증 실패로 조기 종료).
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
    });

    it("create: 순환 참조 트리에서도 무한루프 없이 라벨 산출(seen 가드)", async () => {
      prismaMock.contractCategory.findMany.mockResolvedValueOnce([
        { id: "a", name: "A", parentId: "b" },
        { id: "b", name: "B", parentId: "a" },
      ]);
      prismaMock.contract.create.mockResolvedValue({
        ...fullRow("unassigned"),
        id: "ct-cycle",
        categoryId: "a",
        categoryLabel: "B > A",
      });
      await service.create({ ...createReq, categoryId: "a", ...makeCtx() });
      const data = prismaMock.contract.create.mock.calls[0][0].data;
      // 순환이라도 각 노드 1회만 방문 → 유한 경로.
      expect(data.categoryLabel).toBe("B > A");
    });

    it("update: categoryId 변경 시 categoryLabel 재산출 동시 갱신", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));

      await service.update({ id: "ct-1", categoryId: "cat-minor", viewerId: "admin-1", ...makeCtx() });

      const data = prismaMock.contract.update.mock.calls[0][0].data;
      expect(data.categoryId).toBe("cat-minor");
      expect(data.categoryLabel).toBe("개발/공급 > 소프트웨어");
    });

    it("update: categoryId 를 null 로 변경하면 categoryLabel 도 null", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));

      await service.update({ id: "ct-1", categoryId: null, viewerId: "admin-1", ...makeCtx() });

      const data = prismaMock.contract.update.mock.calls[0][0].data;
      expect(data.categoryId).toBeNull();
      expect(data.categoryLabel).toBeNull();
    });

    it("update: categoryId 미전송 시 categoryId/categoryLabel 둘 다 건드리지 않음", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));

      await service.update({ id: "ct-1", title: "제목만", viewerId: "admin-1", ...makeCtx() });

      const data = prismaMock.contract.update.mock.calls[0][0].data;
      expect(data.categoryId).toBeUndefined();
      expect(data.categoryLabel).toBeUndefined();
    });

    it("get/toResponse: categoryId/categoryLabel 을 노출한다", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValue({
        ...fullRow("unassigned"),
        categoryId: "cat-saas",
        categoryLabel: "개발/공급 > 소프트웨어 > SaaS 이용",
      });
      const res = await service.get({ id: "ct-1", viewerId: "admin-1", ...makeCtx() });
      expect(res.categoryId).toBe("cat-saas");
      expect(res.categoryLabel).toBe("개발/공급 > 소프트웨어 > SaaS 이용");
    });

    // --- FR-1: C1 — resolveCategoryLabel tenantScope 격리 + categoryId 소유 검증 ---

    it("create: 타 테넌트 categoryId 로 create 시 400 RpcException (tenantScope 필터로 빈 결과)", async () => {
      // tenantScope(ctx) 로 필터된 findMany 가 빈 배열 반환 → label null → 400 throw.
      prismaMock.contractCategory.findMany.mockResolvedValueOnce([]);
      await expect(
        service.create({ ...createReq, categoryId: "cat-other-tenant", ...makeCtx("t1") }),
      ).rejects.toMatchObject({ error: { status: 400, message: "유효하지 않은 카테고리" } });
      // DB 저장 전에 예외가 발생해야 한다.
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
      // tenantScope 가 where 에 적용되었는지 검증.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const findArg = (prismaMock.contractCategory.findMany.mock.calls as unknown[][])[0]?.[0];
      expect(findArg).toMatchObject({ where: { tenantId: "t1" } });
    });

    it("create: 본인 테넌트 categoryId 면 categoryLabel 정상 산출 후 저장 성공", async () => {
      // 본인 테넌트(t1) 카테고리 트리 반환 → label 산출 → create 성공.
      prismaMock.contractCategory.findMany.mockResolvedValueOnce([
        { id: "cat-own", name: "서비스계약", parentId: null },
      ]);
      prismaMock.contract.create.mockResolvedValue({
        ...fullRow("unassigned"),
        id: "ct-own",
        categoryId: "cat-own",
        categoryLabel: "서비스계약",
      });
      const result = await service.create({ ...createReq, categoryId: "cat-own", ...makeCtx("t1") });
      const data = prismaMock.contract.create.mock.calls[0][0].data;
      expect(data.categoryId).toBe("cat-own");
      // label 이 null 이 아님 → 400 없이 저장.
      expect(data.categoryLabel).toBe("서비스계약");
      expect(result.categoryLabel).toBe("서비스계약");
    });
  });

  // --- Task 8: 테넌트 격리(tenantScope) ---

  it("get: 타 테넌트 계약은 404 (tenantScope 적용)", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null); // scope 로 안 잡힘
    await expect(
      service.get({ id: "ct-other", ...makeCtx("t1") }),
    ).rejects.toBeInstanceOf(RpcException);
    const arg = prismaMock.contract.findFirst.mock.calls[0][0];
    expect(arg.where).toMatchObject({ tenantId: "t1" });
  });

  it("create: 행에 활성 tenantId 를 박는다", async () => {
    prismaMock.contract.create.mockResolvedValue({ ...fullRow("unassigned"), id: "ct-new" });
    await service.create({ ...createReq, ...makeCtx("t1") });
    const arg = prismaMock.contract.create.mock.calls[0][0];
    expect(arg.data.tenantId).toBe("t1");
  });

  it("시스템 admin 은 tenantScope 없이 전 테넌트 조회", async () => {
    // isSystemAdmin=true → loadViewer 가 user.findUnique 를 호출, inHouseCounsel 로 매핑.
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "admin-1", departmentId: "dept-1" });
    prismaMock.contract.findFirst.mockResolvedValue(rowWithSecrets());
    await service.get({ id: "ct1", viewerId: "admin-1", tenantContext: { isSystemAdmin: true } });
    const arg = prismaMock.contract.findFirst.mock.calls[0][0];
    expect(arg.where.tenantId).toBeUndefined();
  });

  it("list: tenantScope 가 where 에 포함된다", async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);
    prismaMock.contract.count.mockResolvedValue(0);
    await service.list({ page: 1, pageSize: 20, ...makeCtx("t1") });
    const findArg = prismaMock.contract.findMany.mock.calls[0][0];
    expect(findArg.where.tenantId).toBe("t1");
    const countArg = prismaMock.contract.count.mock.calls[0][0];
    expect(countArg.where.tenantId).toBe("t1");
  });

  it("update: tenantScope 소유 검증 후 수정 (타 테넌트면 404)", async () => {
    // 소유 검증(findFirst) 에서 null → 404 (타 테넌트 id 위조)
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(
      service.update({ id: "ct-other", title: "x", ...makeCtx("t1") }),
    ).rejects.toBeInstanceOf(RpcException);
    const arg = prismaMock.contract.findFirst.mock.calls[0][0];
    expect(arg.where).toMatchObject({ tenantId: "t1" });
  });

  it("updateStatus: tenantScope 소유 검증 후 상태 전이 (타 테넌트면 404)", async () => {
    prismaMock.contract.findFirst.mockResolvedValue(null);
    await expect(
      service.updateStatus({ id: "ct-other", status: "legalReview", ...makeCtx("t1") }),
    ).rejects.toBeInstanceOf(RpcException);
    const arg = prismaMock.contract.findFirst.mock.calls[0][0];
    expect(arg.where).toMatchObject({ tenantId: "t1" });
  });

  it("update: 최종 contract.update where 에 tenantId 포함 (TOCTOU 방어)", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({ id: "ct-1", title: "수정됨", viewerId: "admin-1", ...makeCtx("t1") });
    const arg = prismaMock.contract.update.mock.calls[0][0];
    // ensureExists 이후 최종 update 도 tenantScope 로 이중 방어.
    expect(arg.where).toMatchObject({ id: "ct-1", tenantId: "t1" });
  });

  it("update: 감사 changed 목록에 tenantContext 가 포함되지 않는다", async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
    prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "admin-1" });
    prismaMock.contract.update.mockResolvedValue(fullRow("unassigned"));
    await service.update({ id: "ct-1", title: "제목변경", viewerId: "admin-1", ...makeCtx("t1") });
    const auditCall = auditMock.record.mock.calls.find((c) => c[0]?.action === "update");
    expect(auditCall).toBeDefined();
    const changed: string[] = auditCall![0].detail.changed;
    expect(changed).not.toContain("tenantContext");
    expect(changed).not.toContain("id");
    expect(changed).not.toContain("viewerId");
    expect(changed).toContain("title");
  });

  describe("submitApproval (체결 품의 상신)", () => {
    const approvedRow = (over: Record<string, unknown> = {}) => ({
      ...fullRow("reviewDone"),
      createdById: "requester-1",
      details: {
        ...detailsV1,
        approvers: [
          { userId: "requester-1", name: "한지원", dept: "사업개발팀", type: "draft" },
          { userId: "u-legal", name: "김도윤", dept: "법무팀", type: "approve" },
        ],
      },
      ...over,
    });
    const lineDto = {
      id: "L1",
      targetType: "contract",
      targetId: "ct-1",
      title: "계약",
      status: "pending",
      submittedById: "requester-1",
      submittedByName: "한지원",
      submittedAt: "2026-09-11T01:00:00.000Z",
      decidedAt: null,
      steps: [],
      currentStepId: "S1",
    };

    it("요청자 본인이 아니면 403", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(approvedRow());
      await expect(
        service.submitApproval({ id: "ct-1", viewerId: "someone-else", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 403 } });
    });

    it("reviewDone 이 아니면 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(approvedRow({ status: "legalReview" }));
      await expect(
        service.submitApproval({ id: "ct-1", viewerId: "requester-1", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 400 } });
    });

    it("details.approvers 비어 있으면 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        approvedRow({ details: { ...detailsV1, approvers: [] } }),
      );
      await expect(
        service.submitApproval({ id: "ct-1", viewerId: "requester-1", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 400 } });
    });

    it("진행 중(pending) 라인이 이미 있으면 409", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(approvedRow());
      approvalsMock.getActive.mockResolvedValueOnce({ line: lineDto, historyCount: 0 });
      await expect(
        service.submitApproval({ id: "ct-1", viewerId: "requester-1", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 409 } });
    });

    it("성공: approvals.submit 호출 + signing 전이 + 알림 반환", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(approvedRow());
      approvalsMock.getActive.mockResolvedValueOnce({ line: null, historyCount: 0 });
      approvalsMock.submit.mockResolvedValueOnce({
        line: lineDto,
        notifications: [{ recipientId: "u-legal", notification: { id: "n1" } }],
      });
      prismaMock.contract.update.mockResolvedValue(approvedRow({ status: "signing" }));
      const result = await service.submitApproval({
        id: "ct-1",
        viewerId: "requester-1",
        ...makeCtx(),
      });
      const submitArg = approvalsMock.submit.mock.calls[0][0];
      expect(submitArg.targetType).toBe("contract");
      expect(submitArg.steps).toHaveLength(2);
      expect(submitArg.steps[1]).toEqual({
        userId: "u-legal",
        name: "김도윤",
        dept: "법무팀",
        type: "approve",
      });
      expect(prismaMock.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "signing" } }),
      );
      expect(result.contract.status).toBe("signing");
      expect(result.contract.approvalLine?.id).toBe("L1");
      expect(result.notifications).toHaveLength(1);
      // 감사로그: transition + kind=submitApproval
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "transition",
          detail: expect.objectContaining({ kind: "submitApproval" }),
        }),
      );
      // 상신 성공 시 결재자용 브리핑(approvalBriefing) AI 분석을 트리거한다.
      expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: "contract",
          targetId: "ct-1",
          kind: "approvalBriefing",
          triggeredByUserId: "requester-1",
        }),
      );
    });
  });

  describe("completeSigning", () => {
    const baseRow = {
      id: "c1",
      tenantId: "t1",
      status: "signing",
      createdById: "u-req",
      ownerId: "u-legal",
      departmentId: null,
      securityLevel: "normal",
      details: {},
      counterparties: [],
      files: [],
      references: [],
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    };

    it("권한이 없으면 403", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "general",
        user: { departmentId: null },
      });
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-x",
          signedAt: "2026-09-12",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 403 } });
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    it("결재가 완료되지 않았으면 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "pending", steps: [] },
        historyCount: 0,
      });
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "2026-09-12",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    it("결재선이 아예 없어도 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({ line: null, historyCount: 0 });
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "2026-09-12",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    it("남의 계약 파일을 주면 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "approved", steps: [] },
        historyCount: 0,
      });
      prismaMock.file.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "2026-09-12",
          fileId: "f-other",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    // 코멘트 첨부(File.commentId != null)는 같은 contractId 를 가지므로 findFirst 가
    // commentId:null 도 함께 걸러야 한다 — 아니면 코멘트 첨부가 서명본으로 승격될 수 있다.
    it("코멘트 첨부 파일은 서명본으로 지정할 수 없다 (commentId 가드)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "approved", steps: [] },
        historyCount: 0,
      });
      // commentId:null 필터로 걸러진다고 가정 — mock 은 findFirst where 조건 평가를 하지
      // 않으므로, 서비스가 실제로 commentId:null 을 where 에 넘기는지는 아래에서 검증한다.
      prismaMock.file.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "2026-09-12",
          fileId: "f-comment-1",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400, message: "잘못된 파일입니다" } });
      expect(prismaMock.file.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "f-comment-1", contractId: "c1", commentId: null },
        }),
      );
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    // 재서명 방지: 이미 signed 인 계약은 승인 라인 상태와 무관하게 상태 게이트에서 막힌다.
    // sealManager 는 canTransition 자체가 status==="signing" 에서만 true 라 이 분기에
    // 도달하지 못하므로, 담당(owner) 역할로 도달 가능함을 증명한다.
    it("이미 signed 인 계약은 다시 체결 처리할 수 없다 (400, 재서명 방지)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({
        ...baseRow,
        status: "signed",
        ownerId: "u-legal",
      });
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "inHouseCounsel",
        user: { departmentId: null },
      });
      // 결재선이 approved 라도(=결재 게이트만 보면 통과할 상황) 상태 게이트가 먼저
      // 막아야 한다는 것을 명시하기 위한 셋업 — 아래 not.toHaveBeenCalled() 로 이
      // mock 이 애초에 조회조차 안 됨(상태 게이트에서 조기 종료)을 증명한다.
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "approved", steps: [] },
        historyCount: 0,
      });
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-legal",
          signedAt: "2026-09-12",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400, message: "체결 진행 상태가 아닙니다" } });
      expect(approvalsMock.getActive).not.toHaveBeenCalled();
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    it("정상 처리 시 signed 로 전이하고 signedAt 과 파일 role 을 갱신한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "approved", steps: [] },
        historyCount: 0,
      });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f1", contractId: "c1" });
      prismaMock.contract.update.mockResolvedValueOnce({
        ...baseRow,
        status: "signed",
        signedAt: new Date("2026-09-12"),
      });

      const result = await service.completeSigning({
        contractId: "c1",
        viewerId: "u-seal",
        signedAt: "2026-09-12",
        fileId: "f1",
        note: "원본 보관함 A-3",
        tenantContext: { tenantId: "t1", isSystemAdmin: false },
      });

      expect(prismaMock.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "f1", contractId: "c1", commentId: null },
          data: { role: "signed" },
        }),
      );
      expect(prismaMock.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "c1", status: "signing" }),
          data: expect.objectContaining({ status: "signed" }),
        }),
      );
      expect(result.contract.status).toBe("signed");
      // 결재 완료 게이트에서 이미 로드한 라인을 응답에 그대로 전달해야 한다
      // (재조회 없이) — 그렇지 않으면 응답의 approvalLine 이 null 로 비어 보인다.
      expect(result.contract.approvalLine?.id).toBe("l1");
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "transition",
          detail: expect.objectContaining({ kind: "completeSigning" }),
        }),
      );
    });

    // signedAt 파싱 실패(빈 문자열/잘못된 형식)는 parseDate 가 조용히 null 을 반환하므로,
    // 여기서 걸러내지 않으면 계약이 signed 로 확정되면서 서명일이 없는 상태가 된다.
    it("signedAt 이 올바르지 않으면 400 (파싱 실패를 조용히 넘기지 않는다)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 400, message: "체결일이 올바르지 않습니다" } });
      expect(approvalsMock.getActive).not.toHaveBeenCalled();
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    // 동시 체결 처리 방어(CAS): where 에 status:"signing" 을 넣었으므로, 그 사이 다른
    // 요청이 먼저 커밋되면 대상 행이 없어 Prisma 가 P2025 를 던진다. 이를 그대로
    // 흘리지 않고 409 로 변환해야 한다.
    it("동시 요청으로 이미 처리된 경우 P2025 를 409 로 변환한다 (CAS 실패)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(baseRow);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({
        role: "sealManager",
        user: { departmentId: null },
      });
      approvalsMock.getActive.mockResolvedValueOnce({
        line: { id: "l1", status: "approved", steps: [] },
        historyCount: 0,
      });
      const notFound = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        { code: "P2025", clientVersion: "6.19.3" },
      );
      prismaMock.$transaction.mockRejectedValueOnce(notFound);

      await expect(
        service.completeSigning({
          contractId: "c1",
          viewerId: "u-seal",
          signedAt: "2026-09-12",
          tenantContext: { tenantId: "t1", isSystemAdmin: false },
        }),
      ).rejects.toMatchObject({ error: { status: 409 } });
    });
  });

  describe("create - 체결 완료 등록", () => {
    const baseReq = {
      title: "이미 체결된 계약",
      securityLevel: "normal" as const,
      reviewType: "normal" as const,
      createdById: "u1",
      schemaVersion: 1,
      counterparties: [],
      approvers: [],
      references: [],
      tenantContext: { tenantId: "t1", isSystemAdmin: false },
    };

    it("signedAt 이 없으면 400", async () => {
      await expect(
        service.create({
          ...baseReq,
          registerAs: "signed",
          details: { stage: "new" } as never,
          files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
    });

    it("signedAt 이 파싱 불가능한 값이면 400 (parseDate 가 null 을 조용히 반환해도 게이트를 통과하지 못한다)", async () => {
      await expect(
        service.create({
          ...baseReq,
          registerAs: "signed",
          signedAt: "2026-13-45",
          details: { stage: "new" } as never,
          files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
    });

    it("서명본 파일이 없으면 400", async () => {
      await expect(
        service.create({
          ...baseReq,
          registerAs: "signed",
          signedAt: "2025-12-18",
          details: { stage: "new" } as never,
          files: [{ role: "contract", name: "a.docx", meta: "", sortOrder: 0 }],
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
    });

    it("변경·해지인데 원 계약이 없으면 400", async () => {
      await expect(
        service.create({
          ...baseReq,
          registerAs: "signed",
          signedAt: "2025-12-18",
          details: { stage: "change", relatedDocs: [] } as never,
          files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
        }),
      ).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.contract.create).not.toHaveBeenCalled();
    });

    it("정상이면 signed 상태로 생성하고 risk 분석을 트리거한다", async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ departmentId: null });
      prismaMock.contract.create.mockResolvedValueOnce({
        id: "c1",
        tenantId: "t1",
        status: "signed",
        signedAt: new Date("2025-12-18"),
        details: { stage: "new" },
        createdAt: new Date("2025-12-18"),
        updatedAt: new Date("2025-12-18"),
        counterparties: [],
        files: [],
        references: [],
      });

      const res = await service.create({
        ...baseReq,
        registerAs: "signed",
        signedAt: "2025-12-18",
        details: { stage: "new" } as never,
        files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
      });

      expect(prismaMock.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "signed" }),
        }),
      );
      expect(res.status).toBe("signed");
      expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "risk" }),
      );
    });

    it("registerAs 미지정이면 기존 동작 그대로 - status 를 지정하지 않고 precheck 를 트리거한다", async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ departmentId: null });
      prismaMock.contract.create.mockResolvedValueOnce({
        id: "c2",
        tenantId: "t1",
        status: "unassigned",
        signedAt: null,
        details: { stage: "new" },
        createdAt: new Date("2025-12-18"),
        updatedAt: new Date("2025-12-18"),
        counterparties: [],
        files: [],
        references: [],
      });

      await service.create({
        ...baseReq,
        details: { stage: "new" } as never,
        files: [{ role: "contract", name: "a.docx", meta: "", sortOrder: 0 }],
      });

      const createArg = prismaMock.contract.create.mock.calls[0][0];
      expect(createArg.data.status).toBeUndefined();
      expect(aiAnalysisMock.trigger).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "precheck" }),
      );
    });
  });
});
