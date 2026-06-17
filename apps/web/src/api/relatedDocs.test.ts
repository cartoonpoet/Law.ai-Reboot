import { describe, it, expect } from "vitest";
import { searchRelatedDocs, countByCategory } from "./relatedDocs";

describe("relatedDocs search (mock)", () => {
  it("분류로 필터링한다", async () => {
    const r = await searchRelatedDocs({ categories: ["litigation"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.category === "litigation")).toBe(true);
  });

  it("키워드는 name·sub 부분일치로 찾는다", async () => {
    const r = await searchRelatedDocs({ query: "자문" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.name.includes("자문") || d.sub.includes("자문"))).toBe(true);
  });

  it("분류+키워드 동시 적용", async () => {
    const r = await searchRelatedDocs({ query: "삼성", categories: ["contract"] });
    expect(r.every((d) => d.category === "contract")).toBe(true);
  });

  it("countByCategory는 분류별 합계를 반환", () => {
    const c = countByCategory();
    expect(c.contract).toBeGreaterThan(0);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(10);
  });
});
