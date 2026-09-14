import { describe, expect, it } from "vitest";
import { getDaysLeft } from "./getDaysLeft";

const NOW = new Date(2026, 8, 14, 15, 30);

describe("getDaysLeft", () => {
  it("기한이 없으면 null", () => {
    expect(getDaysLeft(null, NOW)).toBeNull();
  });

  it("시각과 상관없이 달력 날짜로 센다", () => {
    expect(getDaysLeft(new Date(2026, 8, 14, 0, 1).toISOString(), NOW)).toBe(0);
    expect(getDaysLeft(new Date(2026, 8, 15, 23, 59).toISOString(), NOW)).toBe(1);
  });

  it("지난 기한은 음수", () => {
    expect(getDaysLeft(new Date(2026, 8, 11).toISOString(), NOW)).toBe(-3);
  });
});
