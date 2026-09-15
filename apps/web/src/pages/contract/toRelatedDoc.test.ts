import { describe, it, expect } from "vitest";
import type { ContractSummary } from "@lawai/contracts";
import { toRelatedDoc } from "./toRelatedDoc";

const summary: ContractSummary = {
  id: "7f1c9c1e-2b1a-4c1d-9a55-1f2a3b4c5d6e",
  code: "C20260512-0101",
  title: "SW 공급계약",
  status: "signed",
  securityLevel: "normal",
  party: null,
  categoryLabel: null,
  counterpartyName: "삼성전자(주)",
  requesterId: null,
  requesterName: null,
  ownerId: null,
  ownerName: null,
  dueDate: null,
  periodEnd: null,
  signedAt: "2026-05-12T00:00:00.000Z",
  createdById: "u1",
  updatedAt: "2026-06-01T09:00:00.000Z",
};

describe("toRelatedDoc", () => {
  it("계약을 관련문서로 — 이름·관리번호·상태·상대방·체결일", () => {
    expect(toRelatedDoc(summary)).toEqual({
      id: summary.id,
      name: "SW 공급계약",
      category: "contract",
      sub: "C20260512-0101 · 체결 완료 · 삼성전자(주)",
      date: "2026-05-12",
    });
  });

  it("상대방이 없으면 빼고, 체결 전이면 최근 수정일을 쓴다", () => {
    const doc = toRelatedDoc({ ...summary, status: "legalReview", counterpartyName: null, signedAt: null });
    expect(doc.sub).toBe("C20260512-0101 · 법무 검토 중");
    expect(doc.date).toBe("2026-06-01");
  });
});
