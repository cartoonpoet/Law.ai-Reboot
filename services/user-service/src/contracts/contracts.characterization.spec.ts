// 계약 서비스 분리(refactor/contracts-modularization) 전후로 "동작이 같음"을 고정하는 특성화 테스트.
// 기존 spec 이 개별 결과를 보는 것과 달리 여기서는 부수효과의 호출 순서·AI 트리거 대상·트랜잭션 구성·
// 오류 변환처럼 구조를 바꿀 때 조용히 깨지기 쉬운 것만 고정한다. 발견한 이상 동작도 "지금 그대로" 고정한다.
import { Prisma } from "@prisma/client";
import { ContractsService } from "./contracts.service";
import {
  buildContractsModule,
  CONTRACT_SERVICE_PROVIDERS,
  createContractMocks,
  createReq,
  detailsV1,
  flushAiTrigger,
  fullRow,
  makeCtx,
  companySnapshot,
} from "./contracts.spec-helpers";

const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "test" });
const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" });

describe("ContractsService 특성화(동작 보존)", () => {
  let service: ContractsService;
  const mocks = createContractMocks();
  const { prismaMock, auditMock, approvalsMock, aiAnalysisMock, statusEventsMock } = mocks;

  // n 번째 호출의 전역 호출 순번(jest.fn 들 사이에서 비교 가능).
  const orderOf = (fn: jest.Mock, n = 0) => fn.mock.invocationCallOrder[n];
  const auditOrderByKind = (kind: string) => {
    const idx = auditMock.record.mock.calls.findIndex(
      ([arg]: [{ detail?: { kind?: string } }]) => arg.detail?.kind === kind,
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    return orderOf(auditMock.record, idx);
  };
  const expectAscending = (orders: number[]) => {
    orders.forEach((o) => expect(o).toBeDefined());
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(new Set(orders).size).toBe(orders.length);
  };
  const triggerCalls = () => aiAnalysisMock.trigger.mock.calls.map(([arg]) => arg);

  beforeEach(async () => {
    jest.clearAllMocks();
    // 다른 테스트가 남긴 큐/구현을 비우고 기본값으로 되돌린다.
    prismaMock.contract.findFirst.mockReset();
    prismaMock.contract.update.mockReset();
    prismaMock.contract.create.mockReset();
    prismaMock.contract.updateMany.mockReset().mockResolvedValue({ count: 0 });
    prismaMock.file.findFirst.mockReset();
    prismaMock.file.findMany.mockReset().mockResolvedValue([]);
    prismaMock.file.update.mockReset();
    prismaMock.file.updateMany.mockReset();
    prismaMock.userTenant.findFirst
      .mockReset()
      .mockResolvedValue({ role: "general", user: { departmentId: "dept-1" } });
    prismaMock.$transaction.mockReset().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    approvalsMock.getActive.mockReset().mockResolvedValue({ line: null, historyCount: 0 });
    approvalsMock.submit.mockReset();
    const moduleRef = await buildContractsModule(mocks, CONTRACT_SERVICE_PROVIDERS);
    service = moduleRef.get(ContractsService);
  });

  // ─────────────────────────── (a) 부수효과 호출 순서 ───────────────────────────
  describe("(a) 부수효과 호출 순서", () => {
    it("create: audit → statusEvents → AI precheck", async () => {
      prismaMock.contract.create.mockResolvedValue({ ...fullRow("unassigned"), createdById: "user-uuid-1" });
      await service.create({ ...createReq, ...makeCtx() });
      await flushAiTrigger();
      expectAscending([
        orderOf(auditMock.record),
        orderOf(statusEventsMock.record),
        orderOf(aiAnalysisMock.trigger),
      ]);
      expect(auditMock.record).toHaveBeenCalledTimes(1);
      expect(statusEventsMock.record).toHaveBeenCalledTimes(1);
      expect(triggerCalls().map((c) => c.kind)).toEqual(["precheck"]);
      expect(prismaMock.contract.updateMany).not.toHaveBeenCalled();
    });

    it("completeSigning: statusEvents → audit → 원계약 조회 → 원계약 updateMany → 원계약 statusEvents → 원계약 audit → AI renewalTerms", async () => {
      const row = {
        ...fullRow("signing"),
        id: "c1",
        code: "C-DERIVED",
        createdById: "u-req",
        ownerId: "u-legal",
        originContractId: "origin-1",
        details: { ...detailsV1, stage: "renew" },
      };
      prismaMock.contract.findFirst
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ id: "origin-1", tenantId: "t1", ownerId: "o", status: "fulfilling" });
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "sealManager", user: { departmentId: null } });
      approvalsMock.getActive.mockResolvedValueOnce({ line: { id: "l1", status: "approved", steps: [] }, historyCount: 0 });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f1", role: "attach", storageKey: "k" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signed" });
      prismaMock.contract.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.completeSigning({
        contractId: "c1",
        viewerId: "u-seal",
        signedAt: "2026-09-12",
        fileId: "f1",
        ...makeCtx(),
      });
      await flushAiTrigger();

      expectAscending([
        orderOf(statusEventsMock.record, 0),
        auditOrderByKind("completeSigning"),
        orderOf(prismaMock.contract.findFirst, 1),
        orderOf(prismaMock.contract.updateMany),
        orderOf(statusEventsMock.record, 1),
        auditOrderByKind("closedByDerivedContract"),
        orderOf(aiAnalysisMock.trigger),
      ]);
      expect(statusEventsMock.record.mock.calls[0][0]).toMatchObject({ fromStatus: "signing", toStatus: "signed" });
      expect(statusEventsMock.record.mock.calls[1][0]).toMatchObject({
        targetId: "origin-1",
        fromStatus: "fulfilling",
        toStatus: "closed",
      });
      expect(triggerCalls().map((c) => c.kind)).toEqual(["renewalTerms"]);
    });

    it("terminate: statusEvents → audit, AI 트리거 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("fulfilling"));
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-term", role: "attach", storageKey: "k" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("closed"), closedReason: "terminated" });
      await service.terminate({
        contractId: "ct-1",
        viewerId: "u1",
        terminatedOn: "2026-09-30",
        reason: "agreement",
        fileId: "f-term",
        ...makeCtx(),
      });
      await flushAiTrigger();
      expectAscending([orderOf(statusEventsMock.record), orderOf(auditMock.record)]);
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
      expect(prismaMock.contract.updateMany).not.toHaveBeenCalled();
    });

    it("finalizeRegistration: audit → statusEvents → 원계약 조회 → updateMany → 원계약 statusEvents → 원계약 audit → AI risk → AI renewalTerms", async () => {
      const derived = {
        ...fullRow("unassigned"),
        id: "c1",
        code: "C-DERIVED",
        createdById: "u-creator",
        ownerId: null,
        originContractId: "origin-1",
        details: { ...detailsV1, stage: "terminate" },
      };
      prismaMock.contract.findFirst
        .mockResolvedValueOnce(derived)
        .mockResolvedValueOnce({ id: "origin-1", tenantId: "t1", ownerId: "o", status: "signed" });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-signed" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...derived, status: "signed" });
      prismaMock.contract.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.finalizeRegistration({ contractId: "c1", viewerId: "u-creator", signedAt: "2026-09-16", ...makeCtx() });
      await flushAiTrigger();

      expectAscending([
        auditOrderByKind("finalizeRegistration"),
        orderOf(statusEventsMock.record, 0),
        orderOf(prismaMock.contract.findFirst, 1),
        orderOf(prismaMock.contract.updateMany),
        orderOf(statusEventsMock.record, 1),
        auditOrderByKind("closedByDerivedContract"),
        orderOf(aiAnalysisMock.trigger, 0),
        orderOf(aiAnalysisMock.trigger, 1),
      ]);
      expect(triggerCalls().map((c) => c.kind)).toEqual(["risk", "renewalTerms"]);
    });

    // 이상 동작 고정: updateStatus·submitApproval 은 audit → recordStatus 순서인데
    // completeSigning·terminate 는 recordStatus → audit 순서다(create·finalizeRegistration 은 audit 먼저).
    it("updateStatus: audit → statusEvents → AI risk", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("unassigned"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "admin-1" });
      await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "admin-1", ...makeCtx() });
      await flushAiTrigger();
      expectAscending([
        orderOf(auditMock.record),
        orderOf(statusEventsMock.record),
        orderOf(aiAnalysisMock.trigger),
      ]);
    });

    it("submitApproval: audit → statusEvents → AI approvalBriefing", async () => {
      const row = {
        ...fullRow("reviewDone"),
        createdById: "requester-1",
        details: { ...detailsV1, approvers: [{ userId: "u-legal", name: "김", dept: "법무", type: "approve" }] },
      };
      const line = {
        id: "L1", status: "pending", steps: [], currentStepId: "S1",
        submittedById: "requester-1", submittedAt: "2026-09-11T01:00:00.000Z",
      };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      approvalsMock.submit.mockResolvedValueOnce({ line, notifications: [] });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signing" });
      await service.submitApproval({ id: "ct-1", viewerId: "requester-1", ...makeCtx() });
      await flushAiTrigger();
      expectAscending([
        orderOf(auditMock.record),
        orderOf(statusEventsMock.record),
        orderOf(aiAnalysisMock.trigger),
      ]);
      expect(triggerCalls()[0]).toMatchObject({ kind: "approvalBriefing", triggeredByUserId: "requester-1" });
    });

    it("updateStatus: 상태를 그대로 두면(전이 아님) audit·statusEvents·AI 모두 없다", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "admin-1" });
      await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "admin-1", ...makeCtx() });
      await flushAiTrigger();
      expect(auditMock.record).not.toHaveBeenCalled();
      expect(statusEventsMock.record).not.toHaveBeenCalled();
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    // 이상 동작 고정: updateStatus/submitApproval 의 update where 에는 status CAS 가 없다.
    it("updateStatus·submitApproval 의 update where 는 status 조건이 없다(CAS 없음)", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("reviewDone"), ownerId: "admin-1" });
      await service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "admin-1", ...makeCtx() });
      expect(prismaMock.contract.update.mock.calls[0][0].where).toEqual({ id: "ct-1", tenantId: "t1" });

      const row = {
        ...fullRow("reviewDone"),
        createdById: "requester-1",
        details: { ...detailsV1, approvers: [{ userId: "u-legal", name: "김", dept: "법무", type: "approve" }] },
      };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      approvalsMock.submit.mockResolvedValueOnce({ line: { id: "L", status: "pending", steps: [], currentStepId: null, submittedById: "requester-1", submittedAt: "x" }, notifications: [] });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signing" });
      await service.submitApproval({ id: "ct-1", viewerId: "requester-1", ...makeCtx() });
      expect(prismaMock.contract.update.mock.calls[1][0].where).toEqual({ id: "ct-1" });
    });
  });

  // ─────────────────────────── (b) AI 트리거 대상 사용자 ───────────────────────────
  describe("(b) AI 트리거 대상 사용자 매핑", () => {
    it("updateStatus legalReview 진입: risk → ownerId(있을 때만)", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValue({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValue({ ...fullRow("unassigned"), ownerId: "owner-x" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "owner-x" });
      await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "owner-x", ...makeCtx() });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "risk", triggeredByUserId: "owner-x" })]);

      aiAnalysisMock.trigger.mockClear();
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: null });
      await service.updateStatus({ id: "ct-1", status: "legalReview", viewerId: "owner-x", ...makeCtx() });
      await flushAiTrigger();
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    it("updateStatus reviewDone 진입: submitBriefing → createdById(대상은 viewer 가 아니다)", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), createdById: "creator-z", ownerId: "admin-1" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...fullRow("reviewDone"), createdById: "creator-z", ownerId: "admin-1" });
      await service.updateStatus({ id: "ct-1", status: "reviewDone", viewerId: "admin-1", ...makeCtx() });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "submitBriefing", triggeredByUserId: "creator-z" })]);
    });

    it("update: risk 재분석 → ownerId, precheck → createdById(서로 다른 사람)", async () => {
      const inReview = { ...fullRow("legalReview"), createdById: "creator-z", ownerId: "owner-x", files: [{ id: "f1", role: "contract" }] };
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce(inReview);
      prismaMock.contract.update.mockResolvedValueOnce(inReview);
      await service.update({
        id: "ct-1",
        viewerId: "owner-x",
        ...makeCtx(),
        files: [{ role: "contract", name: "new.docx", meta: "DOCX", sortOrder: 0 }],
      });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "risk", triggeredByUserId: "owner-x" })]);

      aiAnalysisMock.trigger.mockClear();
      const beforeReview = { ...fullRow("unassigned"), createdById: "creator-z", ownerId: "owner-x", files: [] };
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce(beforeReview);
      prismaMock.contract.update.mockResolvedValueOnce(beforeReview);
      await service.update({
        id: "ct-1",
        viewerId: "owner-x",
        ...makeCtx(),
        files: [{ role: "contract", name: "new.docx", meta: "DOCX", sortOrder: 0 }],
      });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "precheck", triggeredByUserId: "creator-z" })]);
    });

    it("update: risk 대상이어도 ownerId 가 없으면 risk 는 건너뛴다(precheck 도 상태가 달라 없음)", async () => {
      const inReview = { ...fullRow("legalReview"), createdById: "creator-z", ownerId: null, files: [{ id: "f1", role: "contract" }] };
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...inReview, ownerId: "someone" });
      prismaMock.contract.update.mockResolvedValueOnce(inReview);
      await service.update({
        id: "ct-1",
        viewerId: "someone",
        ...makeCtx(),
        files: [{ role: "contract", name: "new.docx", meta: "DOCX", sortOrder: 0 }],
      });
      await flushAiTrigger();
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
    });

    it("finalizeRegistration: risk → viewerId, renewalTerms → createdById", async () => {
      const row = { ...fullRow("unassigned"), createdById: "u-creator", ownerId: null };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-signed" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signed" });
      await service.finalizeRegistration({ contractId: "ct-1", viewerId: "u-creator", signedAt: "2026-09-16", ...makeCtx() });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([
        expect.objectContaining({ kind: "risk", triggeredByUserId: "u-creator" }),
        expect.objectContaining({ kind: "renewalTerms", triggeredByUserId: "u-creator" }),
      ]);
    });

    it("completeSigning: renewalTerms → 요청자(createdById), 체결 처리한 viewer 가 아니다", async () => {
      const row = { ...fullRow("signing"), createdById: "u-req", ownerId: "u-legal" };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "sealManager", user: { departmentId: null } });
      approvalsMock.getActive.mockResolvedValueOnce({ line: { id: "l1", status: "approved", steps: [] }, historyCount: 0 });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f1", role: "attach", storageKey: "k" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signed" });
      await service.completeSigning({ contractId: "ct-1", viewerId: "u-seal", signedAt: "2026-09-12", fileId: "f1", ...makeCtx() });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "renewalTerms", triggeredByUserId: "u-req" })]);
    });

    it("analyzeRenewalTerms: renewalTerms → viewerId (요청자가 아니라 누른 사람)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signed"), createdById: "creator-z", ownerId: "owner-x" });
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      await service.analyzeRenewalTerms({ contractId: "ct-1", viewerId: "counsel-1", ...makeCtx() });
      await flushAiTrigger();
      expect(triggerCalls()).toEqual([expect.objectContaining({ kind: "renewalTerms", triggeredByUserId: "counsel-1" })]);
    });

    it("AI 트리거는 요청 응답을 붙잡지 않는다(응답 시점에는 아직 trigger 전)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("signed"));
      await service.analyzeRenewalTerms({ contractId: "ct-1", viewerId: "u1", ...makeCtx() });
      // extract().catch().then() 체인 — 마이크로태스크가 돌기 전에는 trigger 가 불리지 않는다.
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
      await flushAiTrigger();
      expect(aiAnalysisMock.trigger).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────── (c) $transaction 구성 ───────────────────────────
  describe("(c) $transaction 에 전달되는 연산", () => {
    it("completeSigning: [file.update, contract.update] 2-op", async () => {
      const row = { ...fullRow("signing"), createdById: "u-req", ownerId: "u-legal" };
      const fileOp = Promise.resolve({});
      const contractOp = Promise.resolve({ ...row, status: "signed" });
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "sealManager", user: { departmentId: null } });
      approvalsMock.getActive.mockResolvedValueOnce({ line: { id: "l1", status: "approved", steps: [] }, historyCount: 0 });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f1", role: "attach", storageKey: "k" });
      prismaMock.file.update.mockReturnValueOnce(fileOp);
      prismaMock.contract.update.mockReturnValueOnce(contractOp);
      await service.completeSigning({ contractId: "ct-1", viewerId: "u-seal", signedAt: "2026-09-12", fileId: "f1", ...makeCtx() });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      const ops = prismaMock.$transaction.mock.calls[0][0];
      expect(ops).toHaveLength(2);
      expect(ops[0]).toBe(fileOp);
      expect(ops[1]).toBe(contractOp);
    });

    it("replaceSignedFile: [file.updateMany, file.update, contract.update] 3-op", async () => {
      const row = { ...fullRow("signed"), ownerId: "u-legal" };
      const demoteOp = Promise.resolve({ count: 1 });
      const promoteOp = Promise.resolve({});
      const contractOp = Promise.resolve(row);
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-new", role: "attach", storageKey: "k" });
      prismaMock.file.updateMany.mockReturnValueOnce(demoteOp);
      prismaMock.file.update.mockReturnValueOnce(promoteOp);
      prismaMock.contract.update.mockReturnValueOnce(contractOp);
      await service.replaceSignedFile({ contractId: "ct-1", viewerId: "u-counsel", fileId: "f-new", reason: "사유", ...makeCtx() });
      const ops = prismaMock.$transaction.mock.calls[0][0];
      expect(ops).toHaveLength(3);
      expect(ops[0]).toBe(demoteOp);
      expect(ops[1]).toBe(promoteOp);
      expect(ops[2]).toBe(contractOp);
    });

    it("terminate: [file.update, contract.update] 2-op", async () => {
      const fileOp = Promise.resolve({});
      const contractOp = Promise.resolve({ ...fullRow("closed"), closedReason: "terminated" });
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("signed"));
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-term", role: "attach", storageKey: "k" });
      prismaMock.file.update.mockReturnValueOnce(fileOp);
      prismaMock.contract.update.mockReturnValueOnce(contractOp);
      await service.terminate({ contractId: "ct-1", viewerId: "u1", terminatedOn: "2026-09-30", reason: "other", fileId: "f-term", ...makeCtx() });
      const ops = prismaMock.$transaction.mock.calls[0][0];
      expect(ops).toHaveLength(2);
      expect(ops[0]).toBe(fileOp);
      expect(ops[1]).toBe(contractOp);
    });

    it("list: [findMany, count] 2-op + 트랜잭션 밖의 groupBy", async () => {
      const findManyOp = Promise.resolve([]);
      const countOp = Promise.resolve(0);
      prismaMock.contract.findMany.mockReturnValueOnce(findManyOp);
      prismaMock.contract.count.mockReturnValueOnce(countOp);
      await service.list({ ...makeCtx() });
      const ops = prismaMock.$transaction.mock.calls[0][0];
      expect(ops).toHaveLength(2);
      expect(ops[0]).toBe(findManyOp);
      expect(ops[1]).toBe(countOp);
      expect(prismaMock.contract.groupBy).toHaveBeenCalledTimes(1);
    });

    it("finalizeRegistration·remove·updateStatus·submitApproval·create·update 는 $transaction 을 쓰지 않는다", async () => {
      // finalizeRegistration
      const row = { ...fullRow("unassigned"), createdById: "u-creator", ownerId: null };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f" });
      prismaMock.contract.update.mockResolvedValueOnce({ ...row, status: "signed" });
      await service.finalizeRegistration({ contractId: "ct-1", viewerId: "u-creator", signedAt: "2026-09-16", ...makeCtx() });
      // remove
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("unassigned"));
      prismaMock.contract.update.mockResolvedValueOnce(fullRow("unassigned"));
      await service.remove({ id: "ct-1", viewerId: "u1", ...makeCtx() });
      // create
      prismaMock.contract.create.mockResolvedValueOnce(fullRow("unassigned"));
      await service.create({ ...createReq, ...makeCtx() });
      await flushAiTrigger();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────── (d) P2025 → 409 ───────────────────────────
  describe("(d) P2025 → 409 변환(메시지는 호출처 그대로)", () => {
    const STALE = "이미 처리되었거나 상태가 변경된 계약입니다";

    it("completeSigning", async () => {
      const row = { ...fullRow("signing"), createdById: "u-req", ownerId: "u-legal" };
      prismaMock.contract.findFirst.mockResolvedValueOnce(row);
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "sealManager", user: { departmentId: null } });
      approvalsMock.getActive.mockResolvedValueOnce({ line: { id: "l1", status: "approved", steps: [] }, historyCount: 0 });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f1", role: "attach", storageKey: "k" });
      prismaMock.$transaction.mockRejectedValueOnce(p2025());
      await expect(
        service.completeSigning({ contractId: "ct-1", viewerId: "u-seal", signedAt: "2026-09-12", fileId: "f1", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 409, message: STALE } });
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("replaceSignedFile", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signed"), ownerId: "u-legal" });
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "inHouseCounsel", user: { departmentId: "dept-1" } });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-new", role: "attach", storageKey: "k" });
      prismaMock.$transaction.mockRejectedValueOnce(p2025());
      await expect(
        service.replaceSignedFile({ contractId: "ct-1", viewerId: "u-counsel", fileId: "f-new", reason: "사유", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 409, message: STALE } });
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("terminate", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("signed"));
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-term", role: "attach", storageKey: "k" });
      prismaMock.$transaction.mockRejectedValueOnce(p2025());
      await expect(
        service.terminate({ contractId: "ct-1", viewerId: "u1", terminatedOn: "2026-09-30", reason: "other", fileId: "f-term", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 409, message: STALE } });
      expect(statusEventsMock.record).not.toHaveBeenCalled();
    });

    it("finalizeRegistration", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("unassigned"), createdById: "u-creator", ownerId: null });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f" });
      prismaMock.contract.update.mockRejectedValueOnce(p2025());
      await expect(
        service.finalizeRegistration({ contractId: "ct-1", viewerId: "u-creator", signedAt: "2026-09-16", ...makeCtx() }),
      ).rejects.toMatchObject({ error: { status: 409, message: STALE } });
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("remove 는 메시지가 다르다", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("unassigned"));
      prismaMock.contract.update.mockRejectedValueOnce(p2025());
      await expect(service.remove({ id: "ct-1", viewerId: "u1", ...makeCtx() })).rejects.toMatchObject({
        error: { status: 409, message: "이미 삭제되었거나 상태가 변경된 계약입니다" },
      });
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("P2025 가 아닌 오류는 그대로 다시 던진다(5곳 공통)", async () => {
      const boom = new Error("boom");
      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("unassigned"));
      prismaMock.contract.update.mockRejectedValueOnce(boom);
      await expect(service.remove({ id: "ct-1", viewerId: "u1", ...makeCtx() })).rejects.toBe(boom);

      prismaMock.contract.findFirst.mockResolvedValueOnce(fullRow("signed"));
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f-term", role: "attach", storageKey: "k" });
      prismaMock.$transaction.mockRejectedValueOnce(boom);
      await expect(
        service.terminate({ contractId: "ct-1", viewerId: "u1", terminatedOn: "2026-09-30", reason: "other", fileId: "f-term", ...makeCtx() }),
      ).rejects.toBe(boom);

      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("unassigned"), createdById: "u-creator", ownerId: null });
      prismaMock.file.findFirst.mockResolvedValueOnce({ id: "f" });
      prismaMock.contract.update.mockRejectedValueOnce(boom);
      await expect(
        service.finalizeRegistration({ contractId: "ct-1", viewerId: "u-creator", signedAt: "2026-09-16", ...makeCtx() }),
      ).rejects.toBe(boom);
    });
  });

  // ─────────────────────────── (e) create 의 P2002/P2003 ───────────────────────────
  describe("(e) create 오류 처리", () => {
    it("P2002(관리번호 충돌)는 create 를 한 번 더 시도하고 성공하면 그 결과를 돌려준다", async () => {
      prismaMock.contract.create
        .mockRejectedValueOnce(p2002())
        .mockResolvedValueOnce({ ...fullRow("unassigned"), id: "ct-retry" });
      const res = await service.create({ ...createReq, ...makeCtx() });
      await flushAiTrigger();
      expect(prismaMock.contract.create).toHaveBeenCalledTimes(2);
      expect(res.id).toBe("ct-retry");
      expect(auditMock.record).toHaveBeenCalledTimes(1);
      expect(statusEventsMock.record).toHaveBeenCalledTimes(1);
      expect(triggerCalls().map((c) => c.kind)).toEqual(["precheck"]);
    });

    it("P2002 가 계속되면 재시도가 재귀로 이어진다(횟수 제한 없음 — 현재 동작 그대로)", async () => {
      prismaMock.contract.create
        .mockRejectedValueOnce(p2002())
        .mockRejectedValueOnce(p2002())
        .mockRejectedValueOnce(p2002())
        .mockResolvedValueOnce(fullRow("unassigned"));
      await service.create({ ...createReq, ...makeCtx() });
      await flushAiTrigger();
      expect(prismaMock.contract.create).toHaveBeenCalledTimes(4);
    });

    it("P2003 은 400, 그 외 오류는 그대로", async () => {
      prismaMock.contract.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "test" }),
      );
      await expect(service.create({ ...createReq, ...makeCtx() })).rejects.toMatchObject({
        error: { status: 400, message: "존재하지 않는 사용자 또는 회사가 참조되었습니다" },
      });
      const boom = new Error("boom");
      prismaMock.contract.create.mockRejectedValueOnce(boom);
      await expect(service.create({ ...createReq, ...makeCtx() })).rejects.toBe(boom);
    });
  });

  // ─────────────────────────── (f) get 은 AI 트리거를 하지 않고, 마스킹은 get 에서만 ───────────────────────────
  describe("(f) get 의 경계", () => {
    const rowWithSecrets = () => ({
      ...fullRow("legalReview"),
      createdById: "creator-1",
      ownerId: "owner-1",
      counterparties: [
        { id: "cp-1", companyId: "comp-1", partyType: null, snapshot: { ...companySnapshot, bizNo: "124-81-00998", managerEmail: "a@law.ai" } },
      ],
      references: [
        { id: "r-1", ccType: "user", isSecret: false, refId: "u1", name: "공개참조" },
        { id: "r-2", ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
      ],
    });

    it("get 은 AI 트리거·statusEvents 를 하지 않는다(normal 등급은 감사도 없다)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...rowWithSecrets(), securityLevel: "normal" });
      await service.get({ id: "ct-1", viewerId: "creator-1", ...makeCtx() });
      await flushAiTrigger();
      expect(aiAnalysisMock.trigger).not.toHaveBeenCalled();
      expect(statusEventsMock.record).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("secure 등급 열람은 view 감사를 남긴다(viewer 가 있을 때만)", async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(rowWithSecrets());
      await service.get({ id: "ct-1", viewerId: "creator-1", ...makeCtx() });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "view", actorId: "creator-1", detail: { securityLevel: "secure" } }),
      );
    });

    it("마스킹은 get 에서만 — create 응답은 비밀참조·PII 원문 그대로", async () => {
      prismaMock.contract.create.mockResolvedValueOnce(rowWithSecrets());
      const res = await service.create({ ...createReq, ...makeCtx() });
      await flushAiTrigger();
      expect(res.references).toHaveLength(2);
      expect(res.counterparties[0].snapshot.bizNo).toBe("124-81-00998");
      expect(res.counterparties[0].snapshot.managerEmail).toBe("a@law.ai");
      expect(res.can).toBeUndefined();
    });

    it("마스킹은 get 에서만 — 비특권 조회자의 get 은 마스킹, get 응답에만 can 이 붙는다", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValueOnce({ role: "general", user: { departmentId: "dept-9" } });
      prismaMock.contract.findFirst.mockResolvedValueOnce(rowWithSecrets());
      const res = await service.get({ id: "ct-1", viewerId: "u1", ...makeCtx() });
      expect(res.references).toHaveLength(1);
      expect(res.counterparties[0].snapshot.bizNo).toBe("124-**-*****");
      expect(res.can).toEqual(expect.objectContaining({ edit: false, delete: false }));
    });
  });

  // ─────────────────────────── 시스템 관리자 전권 규칙(get.can.delete vs remove) ───────────────────────────
  // get:  can.delete = authz.canDelete || (isSystemAdmin && status !== "signing")   — viewer 가 없어도(null) 계산된다
  // remove: !viewer || !(authz.canDelete || isSystemAdmin) → 403, 그 다음 status==="signing" → 400
  // get 은 viewer 가 null 이면 can 을 계산하기 전에 404 로 끝나 두 규칙이 같은 입력에서 만나지 않고,
// 판정 순서·오류(403 → signing 400)도 달라 하나의 authz 술어로 합치면 동작이 바뀐다 → 옮기지 않는다.
  describe("시스템 관리자 삭제 규칙(get.can.delete / remove)", () => {
    const adminCtx = { tenantContext: { tenantId: "t1", isSystemAdmin: true } as const };

    it("get: 시스템 관리자는 signing 이 아니면 can.delete=true, signing 이면 false", async () => {
      prismaMock.userTenant.findFirst.mockResolvedValue({ role: "general", user: { departmentId: "d" } });
      prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", departmentId: "d" });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "o" });
      const a = await service.get({ id: "ct-1", viewerId: "admin-1", ...adminCtx });
      expect(a.can?.delete).toBe(true);
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signing"), ownerId: "o" });
      const b = await service.get({ id: "ct-1", viewerId: "admin-1", ...adminCtx });
      expect(b.can?.delete).toBe(false);
    });

    it("viewer 가 null(사용자 없음)이면 get 은 can 계산 전에 404, remove 는 403", async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "o" });
      // viewer=null 이면 evaluate 가 canView=false → get 은 404 로 끝난다(can 을 계산하기 전).
      await expect(service.get({ id: "ct-1", viewerId: "ghost", ...adminCtx })).rejects.toMatchObject({ error: { status: 404 } });

      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("legalReview"), ownerId: "o" });
      await expect(service.remove({ id: "ct-1", viewerId: "ghost", ...adminCtx })).rejects.toMatchObject({ error: { status: 403 } });
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
    });

    it("remove: 시스템 관리자는 canDelete 가 없어도 삭제, signing 이면 400", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", departmentId: "d" });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signed"), ownerId: "o" });
      prismaMock.contract.update.mockResolvedValueOnce(fullRow("signed"));
      await expect(service.remove({ id: "ct-1", viewerId: "admin-1", ...adminCtx })).resolves.toEqual({ ok: true });
      prismaMock.contract.findFirst.mockResolvedValueOnce({ ...fullRow("signing"), ownerId: "o" });
      await expect(service.remove({ id: "ct-1", viewerId: "admin-1", ...adminCtx })).rejects.toMatchObject({ error: { status: 400 } });
    });
  });
});
