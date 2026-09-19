import { describe, expect, it } from "vitest";
import { canSeeCycleTimeStats } from "./canSeeCycleTimeStats";

describe("canSeeCycleTimeStats", () => {
  it("사내변호사는 볼 수 있다", () => {
    expect(canSeeCycleTimeStats({ isSystemAdmin: false, role: "inHouseCounsel" })).toBe(true);
  });

  it("시스템 관리자는 볼 수 있다", () => {
    expect(canSeeCycleTimeStats({ isSystemAdmin: true, role: null })).toBe(true);
  });

  it("일반·계약담당자·날인담당자는 못 본다", () => {
    expect(canSeeCycleTimeStats({ isSystemAdmin: false, role: "general" })).toBe(false);
    expect(canSeeCycleTimeStats({ isSystemAdmin: false, role: "contractManager" })).toBe(false);
    expect(canSeeCycleTimeStats({ isSystemAdmin: false, role: "sealManager" })).toBe(false);
  });

  it("소속이 확인되지 않으면 못 본다", () => {
    expect(canSeeCycleTimeStats({ isSystemAdmin: false, role: null })).toBe(false);
  });
});
