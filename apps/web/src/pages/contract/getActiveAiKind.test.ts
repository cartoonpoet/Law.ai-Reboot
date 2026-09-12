import { describe, it, expect } from "vitest";
import type { ContractStatus } from "@lawai/contracts";
import { getActiveAiKind } from "./getActiveAiKind";

describe("getActiveAiKind", () => {
  it.each<[ContractStatus, string]>([
    ["draft", "precheck"],
    ["unassigned", "precheck"],
    ["legalReview", "risk"],
    ["reviewDone", "submitBriefing"],
    ["signing", "approvalBriefing"],
  ])("%s → %s", (status, expected) => {
    expect(getActiveAiKind(status)).toBe(expected);
  });

  it.each<ContractStatus>(["assigning", "requesterReview", "signed", "fulfilling", "closed"])(
    "%s 는 null(AI 분석 미제공)을 반환한다",
    (status) => {
      expect(getActiveAiKind(status)).toBeNull();
    },
  );
});
