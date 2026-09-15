import { describe, expect, it } from "vitest";
import { getUnreadBadgeLabel } from "./getUnreadBadgeLabel";

describe("getUnreadBadgeLabel", () => {
  it("99 이하는 숫자 그대로, 넘으면 99+", () => {
    expect(getUnreadBadgeLabel(1)).toBe("1");
    expect(getUnreadBadgeLabel(99)).toBe("99");
    expect(getUnreadBadgeLabel(100)).toBe("99+");
  });
});
