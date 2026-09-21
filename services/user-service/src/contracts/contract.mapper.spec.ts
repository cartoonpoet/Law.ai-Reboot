import { extractCcUserIds, maskCompany, parseDate, toAuthzContract, toContractLinkRef, toResponse, toContractSummary } from "./contract.mapper";
import { companySnapshot, fullRow } from "./contracts.spec-helpers";

describe("contract.mapper", () => {
  it("parseDate: 빈 값·잘못된 값은 null", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate("garbage")).toBeNull();
    expect(parseDate("2026-07-01")).toEqual(new Date("2026-07-01"));
  });

  it("maskCompany: 사업자번호·연락처·이메일만 가린다", () => {
    const m = maskCompany({ ...companySnapshot, phone: "02-111-2222", managerPhone: "010-1234-5678", managerEmail: "a@law.ai" });
    expect(m.bizNo).toBe("124-**-*****");
    expect(m.managerEmail).toBe("a***@law.ai");
    expect(m.managerPhone).toBe("010-****-****");
    expect(m.name).toBe(companySnapshot.name);
    expect(maskCompany({ ...companySnapshot, managerEmail: "nodomain" }).managerEmail).toBe("***");
  });

  it("extractCcUserIds: user 유형만", () => {
    expect(extractCcUserIds([{ ccType: "user", refId: "u1" }, { ccType: "dept", refId: "d1" }])).toEqual(["u1"]);
  });

  it("toContractLinkRef: details.stage 없으면 new", () => {
    expect(toContractLinkRef({ id: "1", code: "C", title: "t", status: "signed", details: {} }).stage).toBe("new");
    expect(toContractLinkRef({ id: "1", code: "C", title: "t", status: "signed", details: { stage: "renew" } }).stage).toBe("renew");
  });

  it("toAuthzContract / toResponse / toContractSummary 기본 매핑", () => {
    const row = { ...fullRow("legalReview"), references: [{ id: "r", ccType: "user", isSecret: false, refId: "u1", name: "n" }] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    expect(toAuthzContract(r)).toMatchObject({ createdById: "u1", ccUserIds: ["u1"], status: "legalReview" });
    const res = toResponse(r);
    expect(res).toMatchObject({ id: "ct-1", approvalLine: null, derivedContracts: [], originContract: null });
    expect(res.references).toHaveLength(1);
    expect(toContractSummary({ ...r, requester: null, owner: null })).toMatchObject({ id: "ct-1", counterpartyName: null, requesterName: null });
  });
});
