import type { ApprovalInboxItem, ContractSummary } from "@lawai/contracts";
import { describe, expect, it } from "vitest";
import { buildTodos } from "./buildTodos";

const NOW = new Date(2026, 8, 14, 10);
const ME = "me";

const createContract = (overrides: Partial<ContractSummary>): ContractSummary => ({
  id: "c1",
  code: "C20260914-0001",
  title: "계약",
  status: "legalReview",
  securityLevel: "normal",
  party: null,
  categoryLabel: null,
  counterpartyName: null,
  requesterId: "someone",
  requesterName: null,
  ownerId: "other",
  ownerName: null,
  dueDate: null,
  signedAt: null,
  createdById: "someone",
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const createApproval = (overrides: Partial<ApprovalInboxItem>): ApprovalInboxItem => ({
  lineId: "l1",
  targetType: "contract",
  targetId: "c9",
  title: "NDA 체결 품의",
  submittedById: "u2",
  submittedByName: "김요청",
  submittedByDept: "영업팀",
  myStepOrder: 0,
  totalSteps: 2,
  myType: "approve",
  submittedAt: NOW.toISOString(),
  lineStatus: "inProgress",
  myStatus: "pending",
  myDecidedAt: null,
  ...overrides,
} as ApprovalInboxItem);

describe("buildTodos", () => {
  it("배정 권한이 있을 때만 미배정 계약을 할 일로 넣는다", () => {
    const contracts = [createContract({ id: "u", status: "unassigned", ownerId: null })];
    expect(buildTodos({ contracts, approvals: [], viewer: { id: ME, canAssign: false }, now: NOW })).toEqual([]);
    const todos = buildTodos({ contracts, approvals: [], viewer: { id: ME, canAssign: true }, now: NOW });
    expect(todos.map((t) => t.action)).toEqual(["담당자 배정"]);
  });

  it("내가 담당인 배정 중·법무 검토 계약만 넣는다", () => {
    const contracts = [
      createContract({ id: "a", status: "assigning", ownerId: ME }),
      createContract({ id: "b", status: "legalReview", ownerId: ME }),
      createContract({ id: "c", status: "legalReview", ownerId: "other" }),
    ];
    const todos = buildTodos({ contracts, approvals: [], viewer: { id: ME, canAssign: false }, now: NOW });
    expect(todos.map((t) => [t.path, t.action])).toEqual([
      ["/contract/a", "검토 시작"],
      ["/contract/b", "법무 검토"],
    ]);
  });

  it("내가 요청했거나 만든 계약의 요청자 검토·검토 완료를 넣는다", () => {
    const contracts = [
      createContract({ id: "a", status: "requesterReview", requesterId: ME }),
      createContract({ id: "b", status: "reviewDone", createdById: ME }),
      createContract({ id: "c", status: "reviewDone" }),
    ];
    const todos = buildTodos({ contracts, approvals: [], viewer: { id: ME, canAssign: false }, now: NOW });
    expect(todos.map((t) => t.action)).toEqual(["검토 의견 확인", "체결 품의 상신"]);
  });

  it("체결 진행 등 할 일 규칙이 없는 상태는 넣지 않는다", () => {
    const contracts = [createContract({ status: "signing", ownerId: ME, requesterId: ME })];
    expect(buildTodos({ contracts, approvals: [], viewer: { id: ME, canAssign: true }, now: NOW })).toEqual([]);
  });

  it("내 차례 결재를 결재 대기함으로 가는 할 일로 넣는다", () => {
    const [todo] = buildTodos({ contracts: [], approvals: [createApproval({})], viewer: { id: ME, canAssign: false }, now: NOW });
    expect(todo).toMatchObject({ type: "결재", title: "NDA 체결 품의", action: "결재하기", path: "/approvals/inbox", status: "1/2단계 · 김요청" });
  });

  it("계약 단계에 맞는 AI 분석을, 결재는 결재 브리핑을 붙일 대상으로 넣는다", () => {
    const contracts = [
      createContract({ id: "risk", status: "legalReview", ownerId: ME }),
      createContract({ id: "none", status: "requesterReview", requesterId: ME }),
    ];
    const todos = buildTodos({ contracts, approvals: [createApproval({})], viewer: { id: ME, canAssign: false }, now: NOW });
    expect(todos.map((t) => [t.key, t.aiTarget])).toEqual([
      ["contract-risk", { contractId: "risk", kind: "risk" }],
      ["contract-none", null],
      ["approval-l1", { contractId: "c9", kind: "approvalBriefing" }],
    ]);
  });

  it("기한이 가까운 순, 기한 없는 일은 뒤로 정렬한다", () => {
    const contracts = [
      createContract({ id: "late", ownerId: ME, dueDate: new Date(2026, 8, 20).toISOString() }),
      createContract({ id: "none", ownerId: ME, dueDate: null }),
      createContract({ id: "soon", ownerId: ME, dueDate: new Date(2026, 8, 15).toISOString() }),
    ];
    const todos = buildTodos({ contracts, approvals: [createApproval({})], viewer: { id: ME, canAssign: false }, now: NOW });
    expect(todos.map((t) => [t.key, t.daysLeft])).toEqual([
      ["contract-soon", 1],
      ["contract-late", 6],
      ["contract-none", null],
      ["approval-l1", null],
    ]);
  });
});
