import { describe, it, expect } from "vitest";
import { getPrecheck } from "./aiPrecheck";

describe("getPrecheck", () => {
  it("계약서 파일이 없으면 미분석 결과를 반환한다", () => {
    expect(getPrecheck(false)).toEqual({ analyzed: false, highCount: 0, risks: [] });
  });

  it("계약서 파일이 있으면 분석 결과(위험 2건, high 1건)를 반환한다", () => {
    const result = getPrecheck(true);
    expect(result.analyzed).toBe(true);
    expect(result.risks).toHaveLength(2);
    expect(result.highCount).toBe(1);
    expect(result.risks.filter((r) => r.level === "high")).toHaveLength(1);
  });
});
