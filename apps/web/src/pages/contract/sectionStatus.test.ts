import { describe, it, expect } from "vitest";
import { deriveSectionStatus, overallPercent } from "./sectionStatus";
import { contractRequestDefaults } from "./request-schema";

describe("deriveSectionStatus", () => {
  it("기본값은 개요 섹션이 미완(필수 남음)이다", () => {
    const s = deriveSectionStatus(contractRequestDefaults);
    const overview = s.find((x) => x.id === "overview")!;
    expect(overview.requiredDone).toBeLessThan(overview.requiredTotal);
    // 정적 기본값엔 필수가 비어 있다(요청자는 생성 화면에서 런타임 주입).
    expect(overview.status).toBe("empty");
  });

  it("개요 필수를 채우면 done", () => {
    const s = deriveSectionStatus({
      ...contractRequestDefaults,
      name: "n", requester: "r", party: "p", catMajor: "a", catMinor: "b", catSub: "c",
      counterparties: [{ id: "c", type: "company", name: "c", bizNo: "x", ceo: null, phone: null, address: null, addressDetail: null, managerName: null, managerPhone: null, managerEmail: null, createdAt: "" }],
    });
    expect(s.find((x) => x.id === "overview")!.status).toBe("done");
  });

  it("overallPercent는 0~100", () => {
    const p = overallPercent(deriveSectionStatus(contractRequestDefaults));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
