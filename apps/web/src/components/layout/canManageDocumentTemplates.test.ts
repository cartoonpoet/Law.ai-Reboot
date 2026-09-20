import { describe, expect, it } from "vitest";
import { canManageDocumentTemplates } from "./canManageDocumentTemplates";

describe("canManageDocumentTemplates", () => {
  it("사내변호사는 볼 수 있다", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "inHouseCounsel" })).toBe(true);
  });

  it("시스템 관리자는 볼 수 있다", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: true, role: null })).toBe(true);
  });

  it("일반·계약담당자·날인담당자는 못 본다", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "general" })).toBe(false);
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "contractManager" })).toBe(false);
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "sealManager" })).toBe(false);
  });

  it("소속이 확인되지 않으면 못 본다", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: null })).toBe(false);
  });
});
