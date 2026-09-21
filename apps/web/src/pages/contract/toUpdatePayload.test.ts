import { describe, it, expect } from "vitest";
import { toCreateRequest } from "./toCreateRequest";
import { toUpdatePayload } from "./toUpdatePayload";
import { contractRequestDefaults, type ContractRequestForm } from "./request-schema";

const form: ContractRequestForm = {
  ...contractRequestDefaults,
  name: "2026년 SaaS 이용계약",
  secure: "top",
  ctype: "std",
  requester: "u-req",
  party: "본사계약",
  categoryId: "cat-1",
  periodStart: "2026-07-01",
  periodEnd: "2026-12-31",
  expectedDate: "2026-06-30",
  registerAs: "signed",
  signedAt: "2026-06-01",
  stage: "renew",
  originContract: { id: "orig-1", code: "C-1", title: "원계약" },
  owner: { id: "u-owner", name: "담당자" },
};

const UPDATE_KEYS = [
  "approvers", "categoryId", "counterparties", "details", "dueDate", "files", "party",
  "periodEnd", "periodStart", "references", "requesterId", "reviewType", "schemaVersion",
  "securityLevel", "title",
].sort();

describe("toUpdatePayload (특성화)", () => {
  it("편집 저장에 나가는 키 집합은 고정이다", () => {
    const payload = toUpdatePayload(toCreateRequest(form));
    expect(Object.keys(payload).sort()).toEqual(UPDATE_KEYS);
  });

  it("ownerId·registerAs·signedAt·originContractId 가 입력에 있어도 걸러낸다", () => {
    const create = toCreateRequest(form);
    expect(create.registerAs).toBe("signed");
    const payload = toUpdatePayload({ ...create, ownerId: "x" });
    expect(Object.keys(payload).sort()).toEqual(UPDATE_KEYS);
    expect(payload).not.toHaveProperty("ownerId");
    expect(payload).not.toHaveProperty("registerAs");
    expect(payload).not.toHaveProperty("signedAt");
    expect(payload).not.toHaveProperty("originContractId");
  });

  it("폼 값이 코어 필드에 그대로 매핑된다", () => {
    const create = toCreateRequest(form);
    const payload = toUpdatePayload(create);
    expect(payload).toEqual({
      title: "2026년 SaaS 이용계약",
      securityLevel: "top",
      reviewType: "std",
      party: "본사계약",
      categoryId: "cat-1",
      requesterId: "u-req",
      periodStart: create.periodStart,
      periodEnd: create.periodEnd,
      dueDate: create.dueDate,
      schemaVersion: 1,
      details: create.details,
      counterparties: create.counterparties,
      approvers: create.approvers,
      files: create.files,
      references: create.references,
    });
  });

  it("기본 폼도 같은 키 집합을 낸다(빈 값은 null)", () => {
    const payload = toUpdatePayload(toCreateRequest(contractRequestDefaults));
    expect(payload).toMatchObject({ title: "", party: null, categoryId: null, requesterId: null, periodStart: null });
    expect(Object.keys(payload).sort()).toEqual(UPDATE_KEYS);
  });
});
