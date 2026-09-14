import { describe, it, expect } from "vitest";
import { getDday } from "./dday";

describe("getDday", () => {
  it("0이면 D-DAY, 빨강", () => {
    expect(getDday(0)).toEqual({ label: "D-DAY", tone: "danger" });
  });

  it("음수면 D+n (경과), 흐리게", () => {
    expect(getDday(-3)).toEqual({ label: "D+3", tone: "faint" });
  });

  it("양수면 D-n", () => {
    expect(getDday(5).label).toBe("D-5");
  });

  it("3일 이내 빨강 · 7일 이내 주황 · 그 뒤 기본", () => {
    expect(getDday(3).tone).toBe("danger");
    expect(getDday(4).tone).toBe("warning");
    expect(getDday(7).tone).toBe("warning");
    expect(getDday(8).tone).toBe("muted");
  });
});
