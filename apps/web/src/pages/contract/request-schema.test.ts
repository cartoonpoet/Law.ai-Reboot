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
      catMajor: "IT·라이선스",
      catMinor: "소프트웨어",
      catSub: "SaaS 이용",
      counterparties: [
        { id: "c1", type: "company", name: "(주)테크파트너스", bizNo: "111-11-11111",
          ceo: null, phone: null, address: null, addressDetail: null,
          managerName: null, managerPhone: null, managerEmail: null,
          createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      contractFiles: [{ name: "계약서.docx", meta: "DOCX · 1.2MB" }],
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
