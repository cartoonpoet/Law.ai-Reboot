import { describe, it, expect } from "vitest";
import { contractRequestSchema, contractRequestDefaults } from "./request-schema";

describe("contractRequestSchema", () => {
  it("기본값은 필수 미충족이라 실패한다", () => {
    expect(contractRequestSchema.safeParse(contractRequestDefaults).success).toBe(false);
  });

  it("필수 필드를 채우면 통과한다", () => {
    const ok = {
      ...contractRequestDefaults,
      name: "SW 공급계약",
      requester: "jhson1",
      party: "(주)테크파트너스",
      categoryId: "cat-saas",
      counterparties: [
        { id: "c1", type: "company", name: "(주)테크파트너스", bizNo: "111-11-11111",
          ceo: null, phone: null, address: null, addressDetail: null,
          managerName: null, managerPhone: null, managerEmail: null,
          createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      contractFiles: [
        { id: null, name: "계약서.docx", meta: "DOCX · 1.2MB", mimeType: null },
      ],
      money: [{ vat: "excluded", amount: 1000, currency: "KRW" }],
      purpose: "<p>배경</p>",
    };
    expect(contractRequestSchema.safeParse(ok).success).toBe(true);
  });

  it("계약서 미첨부 시 contractFiles 에러", () => {
    const r = contractRequestSchema.safeParse(contractRequestDefaults);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "contractFiles")).toBe(true);
    }
  });
});

const signedBase = {
  ...contractRequestDefaults,
  name: "계약",
  requester: "jhson1",
  party: "당사자",
  categoryId: "cat1",
  counterparties: [{ id: "co1", type: "company", name: "상대", bizNo: "1",
    ceo: null, phone: null, address: null, addressDetail: null,
    managerName: null, managerPhone: null, managerEmail: null, createdAt: "2026-01-01" }],
  purpose: "목적",
  money: [{ vat: "excluded" as const, amount: 1000, currency: "KRW" }],
  registerAs: "signed" as const,
};

describe("contractRequestSchema - 등록 유형 교차 검증", () => {
  it("체결 완료 등록인데 체결일이 없으면 signedAt 에러로 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "signedAt")).toBe(true);
    }
  });

  it("체결 완료 등록인데 서명본이 없으면 signedFiles 에러로 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "2025-12-18",
      signedFiles: [],
      contractFiles: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "signedFiles")).toBe(true);
    }
  });

  it("변경 + 체결 완료 등록인데 원 계약이 없으면 originContract 에러로 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      stage: "change" as const,
      originContract: null,
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
      relatedDocs: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "originContract")).toBe(true);
    }
  });

  it("갱신·해지는 검토 요청이어도 원 계약이 있어야 하고, 고르면 통과한다", () => {
    const origin = { id: "o1", code: "C20251010-0412", title: "IDC 입주 계약" };
    const base = {
      ...signedBase,
      registerAs: "review" as const,
      signedAt: "",
      signedFiles: [],
      contractFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
    };
    for (const stage of ["renew", "terminate"] as const) {
      const missing = contractRequestSchema.safeParse({ ...base, stage, originContract: null });
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues.some((i) => i.path[0] === "originContract")).toBe(true);
      }
      expect(contractRequestSchema.safeParse({ ...base, stage, originContract: origin }).success).toBe(true);
    }
  });

  it("체결 완료 등록은 검토용 계약서가 없어도 통과한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
    });
    expect(r.success).toBe(true);
  });

  it("검토 요청은 계약서가 없으면 contractFiles 에러로 실패한다(기존 규칙 유지)", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      registerAs: "review" as const,
      contractFiles: [],
      signedFiles: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "contractFiles")).toBe(true);
    }
  });
});
