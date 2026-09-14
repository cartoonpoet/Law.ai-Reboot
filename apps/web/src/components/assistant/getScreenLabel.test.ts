import { describe, expect, it } from "vitest";
import { getScreenLabel } from "./getScreenLabel";

describe("getScreenLabel", () => {
  it("메뉴 화면 이름을 돌려준다", () => {
    expect(getScreenLabel("/")).toBe("대시보드");
    expect(getScreenLabel("/contract/list")).toBe("계약 조회");
    expect(getScreenLabel("/approvals/inbox")).toBe("결재 대기함");
  });

  it("계약 상세와 수정을 구분한다", () => {
    expect(getScreenLabel("/contract/C20260609-0002")).toBe("계약 상세");
    expect(getScreenLabel("/contract/C20260609-0002/edit")).toBe("계약 수정");
  });

  it("모르는 화면은 서비스 이름으로", () => {
    expect(getScreenLabel("/unknown")).toBe("Law.ai");
  });
});
