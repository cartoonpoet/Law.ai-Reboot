import { describe, it, expect } from "vitest";
import type { ContractResponse } from "@lawai/contracts";
import { toEditDefaults } from "./toEditDefaults";
import { toCreateRequest } from "./toCreateRequest";

const company = {
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

const response: ContractResponse = {
  id: "uuid-1",
  code: "C20260621-0001",
  title: "수정대상",
  status: "legalReview",
  securityLevel: "top",
  reviewType: "std",
  party: "본사계약",
  categoryId: "cat-saas",
  categoryLabel: "개발/공급 > 소프트웨어 > SaaS 이용",
  requesterId: "jhson1",
  requesterName: null,
  ownerId: "lee",
  ownerName: null,
  createdById: "u1",
  periodStart: "2026-07-01T00:00:00.000Z",
  periodEnd: null,
  dueDate: "2026-07-10T00:00:00.000Z",
  signedAt: null,
  schemaVersion: 1,
  details: {
    stage: "change",
    periodText: "",
    periodManual: false,
    noEndDate: false,
    lang: "en",
    legal: "dom",
    negotiation: 70,
    money: [{ vat: "included", amount: 500, currency: "USD" }],
    moneyNote: "비고",
    payTerms: "선금",
    purpose: "목적",
    keyPoints: "핵심",
    concerns: "우려",
    urls: ["https://a.io", "https://b.io"],
    owner: { id: "lee", name: "이법무" },
    project: null,
    relatedDocs: [],
  },
  counterparties: [
    { id: "cp-1", companyId: "comp-1", partyType: null, snapshot: company },
  ],
  approvalLine: {
    id: "l-1",
    status: "pending",
    steps: [
      { id: "s-1", stepOrder: 0, userId: "u-son", name: "손준호", dept: "법무팀", type: "draft", status: "pending", comment: null, decidedAt: null },
      { id: "s-2", stepOrder: 1, userId: "u-lee", name: "이법무", dept: "법무팀", type: "approve", status: "pending", comment: null, decidedAt: null },
    ],
    currentStepId: "s-2",
    submittedById: "u-son",
    submittedAt: "2026-06-01T00:00:00.000Z",
  },
  plannedApprovers: [],
  files: [
    { id: "f-1", role: "contract", name: "계약서.docx", meta: "DOCX", size: null, mimeType: null, storageKey: null, sortOrder: 0 },
    { id: "f-2", role: "attach", name: "별첨.pdf", meta: "PDF", size: null, mimeType: null, storageKey: null, sortOrder: 0 },
  ],
  references: [
    { id: "r-1", ccType: "user", isSecret: false, refId: "u2", name: "김참조" },
    { id: "r-2", ccType: "dept", isSecret: false, refId: "d1", name: "법무팀" },
    { id: "r-3", ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
  ],
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z",
};

describe("toEditDefaults", () => {
  it("응답을 폼 값으로 역매핑한다(코어·details)", () => {
    const f = toEditDefaults(response);
    expect(f.name).toBe("수정대상");
    expect(f.secure).toBe("top");
    expect(f.ctype).toBe("std");
    expect(f.categoryId).toBe("cat-saas");
    expect(f.periodStart).toBe("2026-07-01");
    expect(f.expectedDate).toBe("2026-07-10");
    expect(f.lang).toBe("en");
    expect(f.negotiation).toBe(70);
    expect(f.urls).toEqual([{ value: "https://a.io" }, { value: "https://b.io" }]);
    expect(f.owner).toEqual({ id: "lee", name: "이법무" });
  });

  it("관계를 폼 배열로 복원한다", () => {
    const f = toEditDefaults(response);
    expect(f.counterparties[0].name).toBe("삼성전자(주)");
    expect(f.contractFiles).toEqual([
      { id: "f-1", name: "계약서.docx", meta: "DOCX", mimeType: null },
    ]);
    expect(f.attachFiles).toEqual([
      { id: "f-2", name: "별첨.pdf", meta: "PDF", mimeType: null },
    ]);
    expect(f.ccUsers).toEqual([{ id: "u2", name: "김참조" }]);
    expect(f.ccDepts).toEqual([{ id: "d1", name: "법무팀" }]);
    expect(f.ccSecret).toEqual([{ id: "u9", name: "비밀임원" }]);
    expect(f.approvers).toHaveLength(2);
    expect(f.approvers[1].type).toBe("approve");
  });

  it("plannedApprovers 가 있으면 활성 라인 대신 그걸 우선 사용한다(userId 포함)", () => {
    const withPlanned = {
      ...response,
      plannedApprovers: [
        { userId: "u-planned", name: "박기획", dept: "기획팀", type: "approve" as const },
      ],
    };
    const f = toEditDefaults(withPlanned);
    expect(f.approvers).toEqual([
      { userId: "u-planned", name: "박기획", dept: "기획팀", type: "approve" },
    ]);
  });

  it("plannedApprovers 가 없으면 활성 라인 스텝의 userId 를 보존한다", () => {
    const f = toEditDefaults(response);
    expect(f.approvers[0].userId).toBe("u-son");
    expect(f.approvers[1].userId).toBe("u-lee");
  });

  it("역매핑→toCreateRequest 라운드트립이 안정적이다", () => {
    const req = toCreateRequest(toEditDefaults(response));
    expect(req.title).toBe("수정대상");
    expect(req.securityLevel).toBe("top");
    expect(req.files).toHaveLength(2);
    expect(req.references).toHaveLength(3);
    expect(req.approvers).toHaveLength(2);
    expect(req.counterparties[0].companyId).toBe("comp-1");
  });
});
