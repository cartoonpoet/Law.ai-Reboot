import { describe, it, expect } from "vitest";
import { STATUS_GROUPS, getGroupStatuses, STATUS_GROUP_LABEL } from "./statusGroups";

describe("statusGroups", () => {
  it("전체 그룹은 세부 상태를 비워 둔다", () => {
    expect(getGroupStatuses("all")).toEqual([]);
  });

  it("체결 그룹은 signing 과 signed 를 담는다", () => {
    expect(getGroupStatuses("sign")).toEqual(["signing", "signed"]);
  });

  it("all 을 제외한 모든 상태가 정확히 한 그룹에만 속한다", () => {
    const all = (Object.keys(STATUS_GROUPS) as (keyof typeof STATUS_GROUPS)[])
      .filter((g) => g !== "all")
      .flatMap((g) => STATUS_GROUPS[g]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(10);
  });

  it("모든 그룹에 라벨이 있다", () => {
    for (const g of Object.keys(STATUS_GROUPS)) {
      expect(STATUS_GROUP_LABEL[g as keyof typeof STATUS_GROUPS]).toBeTruthy();
    }
  });
});
