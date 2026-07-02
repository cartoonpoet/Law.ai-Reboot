import { describe, it, expect } from "vitest";
import { dday } from "./dday";

describe("dday", () => {
  it("0이면 D-DAY", () => {
    expect(dday(0).t).toBe("D-DAY");
  });

  it("음수면 D+n (경과)", () => {
    expect(dday(-3).t).toBe("D+3");
  });

  it("양수면 D-n", () => {
    expect(dday(5).t).toBe("D-5");
  });

  it("임박 정도에 따라 색이 달라진다(3일·7일 경계)", () => {
    const c3 = dday(3).c;
    const c5 = dday(5).c;
    const c10 = dday(10).c;
    expect(c3).not.toBe(c5);
    expect(c5).not.toBe(c10);
  });
});
