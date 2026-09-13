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
  categoryId: "cat-saas",
  requester: "jhson1",
  owner: { id: "lee", name: "이법무" },
  expectedDate: "2026-07-10",
  urls: [{ value: "https://example.com" }],
  counterparties: [company],
  contractFiles: [
    { id: null, name: "계약서.docx", meta: "DOCX · 1.2MB", mimeType: null },
  ],
  attachFiles: [
    { id: null, name: "별첨1.pdf", meta: "PDF", mimeType: null },
    { id: null, name: "별첨2.pdf", meta: "PDF", mimeType: null },
  ],
  refFiles: [],
  ccUsers: [{ id: "u1", name: "김참조" }],
  ccDepts: [{ id: "d1", name: "법무팀" }],
  ccSecret: [{ id: "u9", name: "비밀임원" }],
};

describe("toCreateRequest", () => {
  it("코어 컬럼을 펼치고 secure/ctype를 그대로 매핑한다", () => {
    const req = toCreateRequest(form);
    expect(req.title).toBe("테스트 계약");
    expect(req.securityLevel).toBe("top");
    expect(req.reviewType).toBe("std");
    expect(req.categoryId).toBe("cat-saas");
    expect(req.dueDate).toBe("2026-07-10");
  });

  it("업무담당자(form.owner)는 details.owner 로만 보내고 ownerId(법무 담당자)는 보내지 않는다", () => {
    const req = toCreateRequest(form);
    expect(req).not.toHaveProperty("ownerId");
    expect(req.details.owner).toEqual({ id: "lee", name: "이법무" });
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

  it("approvers 에 실 결재자 userId 를 보존한다", () => {
    const withUser: ContractRequestForm = {
      ...form,
      approvers: [{ userId: "u-1", name: "김도윤", dept: "법무팀", type: "approve" }],
    };
    const req = toCreateRequest(withUser);
    expect(req.approvers[0].userId).toBe("u-1");
  });

  it("3개 파일 배열을 role+sortOrder로 평탄화하고 details에서 뺀다", () => {
    const req = toCreateRequest(form);
    expect(req.files).toEqual([
      { role: "contract", name: "계약서.docx", meta: "DOCX · 1.2MB", sortOrder: 0 },
      { role: "attach", name: "별첨1.pdf", meta: "PDF", sortOrder: 0 },
      { role: "attach", name: "별첨2.pdf", meta: "PDF", sortOrder: 1 },
    ]);
    expect("contractFiles" in req.details).toBe(false);
    expect("attachFiles" in req.details).toBe(false);
    expect("refFiles" in req.details).toBe(false);
  });

  it("cc 3개 배열을 ccType+isSecret 참조수신자로 통합하고 details에서 뺀다", () => {
    const req = toCreateRequest(form);
    expect(req.references).toEqual([
      { ccType: "user", isSecret: false, refId: "u1", name: "김참조" },
      { ccType: "dept", isSecret: false, refId: "d1", name: "법무팀" },
      { ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
    ]);
    expect("ccUsers" in req.details).toBe(false);
    expect("ccDepts" in req.details).toBe(false);
    expect("ccSecret" in req.details).toBe(false);
  });

  it("counterparties를 companyId + snapshot으로 동결한다", () => {
    const req = toCreateRequest(form);
    expect(req.counterparties).toHaveLength(1);
    expect(req.counterparties[0].companyId).toBe("comp-1");
    expect(req.counterparties[0].snapshot.name).toBe("삼성전자(주)");
  });

  it("체결 완료 등록이면 registerAs 와 signedAt 을 싣고 서명본을 role=signed 로 매핑한다", () => {
    const req = toCreateRequest({
      ...form,
      registerAs: "signed",
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "sign.pdf", meta: "1MB", mimeType: "application/pdf" }],
    });
    expect(req.registerAs).toBe("signed");
    expect(req.signedAt).toBe("2025-12-18");
    expect(req.files.some((f) => f.role === "signed" && f.name === "sign.pdf")).toBe(true);
  });

  it("검토 요청(registerAs=review)이면 signedAt 을 null 로, 서명본은 files 에 없다", () => {
    const req = toCreateRequest(form);
    expect(req.registerAs).toBe("review");
    expect(req.signedAt).toBeNull();
    expect(req.files.some((f) => f.role === "signed")).toBe(false);
  });
});
