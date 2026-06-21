import { describe, it, expect } from "vitest";
import { toCreateRequest } from "./toCreateRequest";
import { contractRequestDefaults, type ContractRequestForm } from "./request-schema";
import type { Company } from "@lawai/contracts";

const company: Company = {
  id: "comp-1",
  type: "company",
  name: "삼성전자(주)",
  bizNo: "124-81-00998",
  ceo: "한종희",
  phone: null,
  address: null,
  addressDetail: null,
  managerName: null,
  managerPhone: null,
  managerEmail: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const form: ContractRequestForm = {
  ...contractRequestDefaults,
  name: "테스트 계약",
  secure: "top",
  ctype: "std",
  party: "개발/공급",
  catMajor: "개발/공급",
  catMinor: "소프트웨어",
  catSub: "SaaS 이용",
  requester: "jhson1",
  owner: { id: "lee", name: "이법무" },
  expectedDate: "2026-07-10",
  urls: [{ value: "https://example.com" }],
  counterparties: [company],
};

describe("toCreateRequest", () => {
  it("코어 컬럼을 펼치고 secure/ctype를 그대로 매핑한다", () => {
    const req = toCreateRequest(form);
    expect(req.title).toBe("테스트 계약");
    expect(req.securityLevel).toBe("top");
    expect(req.reviewType).toBe("std");
    expect(req.catSub).toBe("SaaS 이용");
    expect(req.ownerId).toBe("lee");
    expect(req.dueDate).toBe("2026-07-10");
    expect(req.schemaVersion).toBe(1);
  });

  it("빈 문자열 코어 필드는 null로 보낸다", () => {
    const req = toCreateRequest({ ...form, periodStart: "", periodEnd: "" });
    expect(req.periodStart).toBeNull();
    expect(req.periodEnd).toBeNull();
  });

  it("urls는 string[]로, 그 외 폼 필드는 details로 모은다", () => {
    const req = toCreateRequest(form);
    expect(req.details.urls).toEqual(["https://example.com"]);
    expect(req.details.purpose).toBe(form.purpose);
  });

  it("approvers는 details가 아닌 최상위로 보낸다(결재선 정규화)", () => {
    const req = toCreateRequest(form);
    expect(req.approvers).toEqual(form.approvers);
    expect("approvers" in req.details).toBe(false);
  });

  it("counterparties를 companyId + snapshot으로 동결한다", () => {
    const req = toCreateRequest(form);
    expect(req.counterparties).toHaveLength(1);
    expect(req.counterparties[0].companyId).toBe("comp-1");
    expect(req.counterparties[0].snapshot.name).toBe("삼성전자(주)");
  });
});
