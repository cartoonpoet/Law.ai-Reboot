import { describe, it, expect } from "vitest";
import { getTenantRoleLabel } from "./tenantRoleLabel";

describe("getTenantRoleLabel", () => {
  it("모든 TenantRole 값을 한국어 라벨로 변환한다", () => {
    expect(getTenantRoleLabel("general")).toBe("일반");
    expect(getTenantRoleLabel("contractManager")).toBe("계약담당자");
    expect(getTenantRoleLabel("inHouseCounsel")).toBe("사내변호사");
    expect(getTenantRoleLabel("outsideCounsel")).toBe("사외변호사");
    expect(getTenantRoleLabel("sealManager")).toBe("날인담당자");
  });
});
