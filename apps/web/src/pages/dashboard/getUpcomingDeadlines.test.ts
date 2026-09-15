import type { ContractSummary } from "@lawai/contracts";
import { describe, expect, it } from "vitest";
import { getUpcomingDeadlines } from "./getUpcomingDeadlines";

const NOW = new Date(2026, 8, 14, 10);
const ME = "me";

const createContract = (id: string, dueDay: number | null, overrides: Partial<ContractSummary> = {}): ContractSummary => ({
  id,
  code: `C-${id}`,
  title: `계약 ${id}`,
  status: "legalReview",
  securityLevel: "normal",
  party: null,
  categoryLabel: null,
  counterpartyName: null,
  requesterId: null,
  requesterName: null,
  ownerId: ME,
  ownerName: null,
  dueDate: dueDay === null ? null : new Date(2026, 8, dueDay).toISOString(),
  periodEnd: null,
  signedAt: null,
  createdById: "other",
  updatedAt: NOW.toISOString(),
  ...overrides,
});

describe("getUpcomingDeadlines", () => {
  it("2주 안(지난 기한 포함)만 가까운 순으로", () => {
    const contracts = [createContract("far", 29), createContract("soon", 16), createContract("over", 12), createContract("none", null)];
    expect(getUpcomingDeadlines(contracts, ME, NOW).map((d) => [d.id, d.daysLeft])).toEqual([
      ["over", -2],
      ["soon", 2],
    ]);
  });

  it("나와 관련된 계약만(담당·요청·작성)", () => {
    const contracts = [
      createContract("owner", 15),
      createContract("requester", 15, { ownerId: "x", requesterId: ME }),
      createContract("creator", 15, { ownerId: "x", createdById: ME }),
      createContract("unrelated", 15, { ownerId: "x" }),
    ];
    expect(getUpcomingDeadlines(contracts, ME, NOW).map((d) => d.id)).toEqual(["owner", "requester", "creator"]);
  });

  it("최대 5건", () => {
    const contracts = Array.from({ length: 8 }, (_, i) => createContract(`c${i}`, 15 + i));
    expect(getUpcomingDeadlines(contracts, ME, NOW)).toHaveLength(5);
  });
});
