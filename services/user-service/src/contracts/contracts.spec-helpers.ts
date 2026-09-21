// contracts.service 계열 spec 이 함께 쓰는 공용 헬퍼(mock 팩토리·고정 데이터·행 빌더).
import type { Provider } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { StatusEventsService } from "../common/status-events/status-events.service";
import { AuditService } from "./contracts.audit";
import { R2Client } from "../files/r2.client";
import { ApprovalsService } from "../approvals/approvals.service";
import { AiAnalysisService } from "../ai-analysis/ai-analysis.service";
import { ContractTextExtractor } from "../ai-analysis/contract-text.extractor";
import type { CreateContractRequest } from "@lawai/contracts";
import { ContractsService } from "./contracts.service";
import { ContractQueryService } from "./contract-query.service";
import { ContractCommandService } from "./contract-command.service";
import { ContractLifecycleService } from "./contract-lifecycle.service";
import { ContractAiTriggers } from "./contract-ai-triggers";

export const companySnapshot = {
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

export const detailsV1 = {
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

export const createReq: CreateContractRequest = {
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
export const makeCtx = (tenantId = "t1") => ({
  tenantContext: { tenantId, isSystemAdmin: false } as const,
});

export const flushAiTrigger = () => new Promise((resolve) => setImmediate(resolve));

// 서비스가 주입받는 의존성 mock 묶음. 호출 기록은 각 spec 의 beforeEach(jest.clearAllMocks)가 지운다.
export const createContractMocks = () => {
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
      // 목록 그룹 탭 건수.
      groupBy: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      // 갱신·해지 계약 체결 시 원 계약 종료(closeOriginOnSigning).
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
      updateMany: jest.fn(),
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
  // 계약서 원본 본문 추출 — 기본은 못 읽음(null). 추출 후 백그라운드로 trigger 되므로 검증 전 flush.
  const contractTextMock = { extract: jest.fn().mockResolvedValue(null) };
  // 통계용 상태 기록 — fire-and-forget 이라 호출 여부만 본다.
  const statusEventsMock = { record: jest.fn().mockResolvedValue(undefined) };
  return { prismaMock, auditMock, r2Mock, approvalsMock, aiAnalysisMock, contractTextMock, statusEventsMock };
};

export type ContractMocks = ReturnType<typeof createContractMocks>;

// facade 와 그 뒤의 서비스들 — 테스트 모듈에 함께 등록한다.
export const CONTRACT_SERVICE_PROVIDERS = [
  ContractsService,
  ContractQueryService,
  ContractCommandService,
  ContractLifecycleService,
  ContractAiTriggers,
];

// mock 을 주입해 Nest 테스트 모듈을 만든다. extraProviders 로 분리된 서비스 클래스를 추가한다.
export const buildContractsModule = async (mocks: ContractMocks, providers: Provider[]) =>
  Test.createTestingModule({
    providers: [
      ...providers,
      { provide: PrismaService, useValue: mocks.prismaMock },
      { provide: AuditService, useValue: mocks.auditMock },
      { provide: R2Client, useValue: mocks.r2Mock },
      { provide: ApprovalsService, useValue: mocks.approvalsMock },
      { provide: AiAnalysisService, useValue: mocks.aiAnalysisMock },
      { provide: ContractTextExtractor, useValue: mocks.contractTextMock },
      { provide: StatusEventsService, useValue: mocks.statusEventsMock },
    ],
  }).compile();

// toResponse 가 요구하는 관계 배열을 포함한 최소 행
export const fullRow = (status: string) => ({
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
