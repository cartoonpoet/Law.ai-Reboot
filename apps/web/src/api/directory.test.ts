import { describe, it, expect } from "vitest";
import { searchUsers, searchDepartments, searchProjects } from "./directory";

describe("directory search (mock)", () => {
  it("사용자 이름 키워드로 필터링한다(대소문자 무시)", async () => {
    const r = await searchUsers("법무");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.name.includes("법무"))).toBe(true);
  });

  it("매칭 없으면 빈 배열", async () => {
    expect(await searchDepartments("존재하지않는팀")).toEqual([]);
  });

  it("limit 개수를 넘기지 않는다", async () => {
    expect((await searchProjects("", 2)).length).toBe(2);
  });
});
