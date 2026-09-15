import { describe, expect, it } from "vitest";
import { checkFileLocked } from "./contractFileLock";

describe("checkFileLocked", () => {
  it("체결 결재가 시작된 뒤(signing·signed·fulfilling·closed)는 잠긴다", () => {
    expect(checkFileLocked("signing")).toBe(true);
    expect(checkFileLocked("signed")).toBe(true);
    expect(checkFileLocked("fulfilling")).toBe(true);
    expect(checkFileLocked("closed")).toBe(true);
  });

  it("검토 전·법무 검토 중에는 잠기지 않는다", () => {
    expect(checkFileLocked("unassigned")).toBe(false);
    expect(checkFileLocked("legalReview")).toBe(false);
    expect(checkFileLocked("reviewDone")).toBe(false);
  });
});
