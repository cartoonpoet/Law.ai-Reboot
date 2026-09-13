import { describe, it, expect } from "vitest";
import { getSubmitPrecheck } from "./getSubmitPrecheck";

describe("getSubmitPrecheck", () => {
  it("결재선 비면 canSubmit=false", () => {
    const r = getSubmitPrecheck({ plannedApprovers: [], hasContractFile: true, annualAmountKrw: null });
    expect(r.canSubmit).toBe(false);
    expect(r.items.find((i) => i.key === "approvers")?.ok).toBe(false);
  });

  it("계약서 파일 없으면 canSubmit=false", () => {
    const r = getSubmitPrecheck({
      plannedApprovers: [{ userId: "u1", name: "a", dept: "d", type: "approve" }],
      hasContractFile: false,
      annualAmountKrw: null,
    });
    expect(r.canSubmit).toBe(false);
    expect(r.items.find((i) => i.key === "contractFile")?.ok).toBe(false);
  });

  it("연간 1억 초과인데 agree 단계 없으면 경고(warn)지만 상신은 가능", () => {
    const r = getSubmitPrecheck({
      plannedApprovers: [{ userId: "u1", name: "a", dept: "d", type: "approve" }],
      hasContractFile: true,
      annualAmountKrw: 120_000_000,
    });
    expect(r.canSubmit).toBe(true);
    expect(r.items.find((i) => i.key === "financeAgree")?.ok).toBe(false);
  });

  it("연간 1억 초과 + agree 단계 있으면 통과", () => {
    const r = getSubmitPrecheck({
      plannedApprovers: [
        { userId: "u1", name: "a", dept: "d", type: "approve" },
        { userId: "u2", name: "b", dept: "재무팀", type: "agree" },
      ],
      hasContractFile: true,
      annualAmountKrw: 120_000_000,
    });
    expect(r.items.find((i) => i.key === "financeAgree")?.ok).toBe(true);
  });

  it("모든 조건 충족 시 canSubmit=true", () => {
    const r = getSubmitPrecheck({
      plannedApprovers: [{ userId: "u1", name: "a", dept: "d", type: "approve" }],
      hasContractFile: true,
      annualAmountKrw: 50_000_000,
    });
    expect(r.canSubmit).toBe(true);
    expect(r.items.every((i) => i.ok)).toBe(true);
  });
});
