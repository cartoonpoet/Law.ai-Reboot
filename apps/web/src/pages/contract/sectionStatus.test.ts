import { describe, it, expect } from "vitest";
import { deriveSectionStatus, overallPercent } from "./sectionStatus";
import { contractRequestDefaults } from "./request-schema";

describe("deriveSectionStatus", () => {
  it("기본값은 개요 섹션이 미완(필수 남음)이다", () => {
    const s = deriveSectionStatus(contractRequestDefaults);
    const overview = s.find((x) => x.id === "overview")!;
    expect(overview.requiredDone).toBeLessThan(overview.requiredTotal);
    // 요청자가 로그인 사용자로 기본 입력되므로 일부 필수만 채워진 partial 상태다.
    expect(overview.status).toBe("partial");
  });

  it("개요 필수를 채우면 done", () => {
    const s = deriveSectionStatus({
      ...contractRequestDefaults,
      name: "n", requester: "r", party: "p", catMajor: "a", catMinor: "b", counterparty: "c",
    });
    expect(s.find((x) => x.id === "overview")!.status).toBe("done");
  });

  it("overallPercent는 0~100", () => {
    const p = overallPercent(deriveSectionStatus(contractRequestDefaults));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
