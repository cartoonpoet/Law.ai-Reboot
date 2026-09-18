import { describe, expect, it } from "vitest";
import { parseAdviceBrief } from "./parseAdviceBrief";

describe("parseAdviceBrief", () => {
  it("요지·쟁점·확인할 점을 읽는다", () => {
    expect(
      parseAdviceBrief({
        summary: "한국법 지정은 가능하나 현지 강행규정을 확인해야 합니다.",
        issues: [{ title: "준거법 합의의 유효성", basis: "국제사법 제45조" }],
        checkPoints: ["독점권 범위가 베트남 전역인지"],
      }),
    ).toEqual({
      summary: "한국법 지정은 가능하나 현지 강행규정을 확인해야 합니다.",
      issues: [{ title: "준거법 합의의 유효성", basis: "국제사법 제45조" }],
      checkPoints: ["독점권 범위가 베트남 전역인지"],
    });
  });

  it("모양이 어긋난 항목은 버리고, 쓸 내용이 없으면 null", () => {
    const parsed = parseAdviceBrief({ summary: "요지", issues: [{ title: "쟁점" }, 3], checkPoints: [1, "확인"] });
    expect(parsed).toEqual({ summary: "요지", issues: [], checkPoints: ["확인"] });
    expect(parseAdviceBrief({ issues: [] })).toBeNull();
    expect(parseAdviceBrief(null)).toBeNull();
  });
});
