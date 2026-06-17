import { describe, it, expect } from "vitest";
import { searchStandardForms, countByFormCategory } from "./standardForms";

describe("standardForms search (mock)", () => {
  it("분류로 필터링한다", async () => {
    const r = await searchStandardForms({ categoryId: "nda" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((f) => f.categoryId === "nda")).toBe(true);
  });

  it("키워드(name)로 찾는다", async () => {
    const r = await searchStandardForms({ query: "MNDA" });
    expect(r.some((f) => f.name.includes("MNDA"))).toBe(true);
  });

  it("countByFormCategory는 분류별 합계", () => {
    const c = countByFormCategory();
    expect(c.nda).toBe(3);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(9);
  });
});
