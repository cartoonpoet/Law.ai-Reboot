import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PublicUser, DepartmentDto } from "@lawai/contracts";
import { searchUsers, searchDepartments, searchPeople, searchProjects } from "./directory";
import * as client from "./client";

vi.mock("./client");

const user = (id: string, name: string, dept: string | null): PublicUser => ({
  id,
  email: `${id}@law.ai`,
  name,
  isSystemAdmin: false,
  departmentId: dept ? `d-${dept}` : null,
  departmentName: dept,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("directory (실 API)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("searchUsers는 '이름 (부서)' 라벨로 매핑한다", async () => {
    vi.mocked(client.apiFetch).mockResolvedValue([
      user("u1", "손준호", "법무팀"),
      user("u2", "김외부", null),
    ] as never);
    const r = await searchUsers("손");
    expect(r).toEqual([
      { id: "u1", name: "손준호 (법무팀)" },
      { id: "u2", name: "김외부" },
    ]);
  });

  it("searchDepartments는 q로 클라이언트 필터링한다", async () => {
    const depts: DepartmentDto[] = [
      { id: "d1", name: "법무팀" },
      { id: "d2", name: "영업팀" },
    ];
    vi.mocked(client.apiFetch).mockResolvedValue(depts as never);
    expect(await searchDepartments("법무")).toEqual([{ id: "d1", name: "법무팀" }]);
    expect(await searchDepartments("없는팀")).toEqual([]);
  });

  it("searchPeople은 PersonRef(name·dept 분리)로 매핑한다", async () => {
    vi.mocked(client.apiFetch).mockResolvedValue([
      user("u1", "이법무", "법무팀"),
    ] as never);
    const r = await searchPeople("이");
    expect(r).toEqual([{ id: "u1", name: "이법무", dept: "법무팀" }]);
  });

  it("searchProjects는 mock(후속)에서 limit으로 자른다", async () => {
    expect((await searchProjects("", 2)).length).toBe(2);
  });
});
