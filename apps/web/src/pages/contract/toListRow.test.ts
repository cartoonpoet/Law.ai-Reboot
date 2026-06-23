import { describe, it, expect } from "vitest";
import type { ContractSummary } from "@lawai/contracts";
import { toListRow } from "./toListRow";

const base: ContractSummary = {
  id: "uuid-1",
  code: "C20260621-0001",
  title: "테스트 계약",
  status: "legalReview",
  securityLevel: "secure",
  party: "본사계약",
  categoryLabel: "개발/공급 > 용역",
  counterpartyName: "AAA",
  requesterId: "jhson1",
  ownerId: null,
  dueDate: "2026-07-01T00:00:00.000Z",
  createdById: "u1",
  updatedAt: "2026-06-21T00:00:00.000Z",
};

describe("toListRow", () => {
  it("요약을 행으로 매핑하고 status를 한글 라벨로 변환한다", () => {
    const row = toListRow(base);
    expect(row.id).toBe("uuid-1"); // 네비게이션용 uuid
    expect(row.code).toBe("C20260621-0001");
    expect(row.name).toBe("테스트 계약");
    expect(row.status).toBe("법무 검토 중");
    expect(row.secure).toBe(true);
    expect(row.counter).toBe("AAA");
  });

  it("owner 없으면 미배정, dueDate 없으면 due '-'", () => {
    const row = toListRow({ ...base, ownerId: null, dueDate: null });
    expect(row.owner).toBe("미배정");
    expect(row.due).toBe("-");
    expect(row.dleft).toBe(0);
  });

  it("normal 보안등급은 secure=false", () => {
    expect(toListRow({ ...base, securityLevel: "normal" }).secure).toBe(false);
  });
});
