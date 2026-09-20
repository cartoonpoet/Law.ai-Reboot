import { describe, expect, it } from "vitest";
import { getNavPermission, getVisibleNavItems, getVisibleNavSections } from "./navPermission";
import { NAV_ITEMS } from "./navSections";

const getItemIds = (permission: { canSeeStats: boolean; canManageDocumentTemplates: boolean }) =>
  getVisibleNavItems(permission).map((item) => item.id);

describe("getVisibleNavSections", () => {
  it("권한이 없으면 업무 통계 메뉴를 빼고, 나머지 메뉴는 그대로 둔다", () => {
    const sections = getVisibleNavSections({ canSeeStats: false, canManageDocumentTemplates: true });
    const overview = sections.find((section) => section.label === "개요");
    expect(overview?.items.map((item) => item.id)).toEqual(["home"]);
    expect(getItemIds({ canSeeStats: false, canManageDocumentTemplates: true })).not.toContain("stats");
    expect(getItemIds({ canSeeStats: false, canManageDocumentTemplates: true })).toContain("c-list");
  });

  it("권한이 있으면 홈 아래에 업무 통계가 붙는다", () => {
    const sections = getVisibleNavSections({ canSeeStats: true, canManageDocumentTemplates: true });
    const overview = sections.find((section) => section.label === "개요");
    expect(overview?.items.map((item) => item.id)).toEqual(["home", "stats"]);
  });

  it("표준양식 관리 권한이 없으면 메뉴에서 빠지고, 있으면 계약 관리 메뉴 끝에 붙는다", () => {
    const withoutPermission = getVisibleNavSections({ canSeeStats: false, canManageDocumentTemplates: false });
    const contract = withoutPermission.find((section) => section.label === "계약 관리");
    expect(contract?.items.map((item) => item.id)).not.toContain("document-templates");

    const withPermission = getVisibleNavSections({ canSeeStats: false, canManageDocumentTemplates: true });
    const contractWithPermission = withPermission.find((section) => section.label === "계약 관리");
    expect(contractWithPermission?.items.map((item) => item.id)).toContain("document-templates");
  });
});

describe("getNavPermission", () => {
  it("사내변호사·시스템관리자만 업무 통계를 본다", () => {
    expect(getNavPermission({ isSystemAdmin: false, role: "inHouseCounsel" }).canSeeStats).toBe(true);
    expect(getNavPermission({ isSystemAdmin: true, role: null }).canSeeStats).toBe(true);
    expect(getNavPermission({ isSystemAdmin: false, role: "general" }).canSeeStats).toBe(false);
  });

  it("사내변호사·시스템관리자만 표준양식 관리를 한다", () => {
    expect(getNavPermission({ isSystemAdmin: false, role: "inHouseCounsel" }).canManageDocumentTemplates).toBe(true);
    expect(getNavPermission({ isSystemAdmin: true, role: null }).canManageDocumentTemplates).toBe(true);
    expect(getNavPermission({ isSystemAdmin: false, role: "general" }).canManageDocumentTemplates).toBe(false);
  });
});

describe("권한 표", () => {
  it("권한이 걸린 메뉴는 실제 메뉴 목록에 있는 id 다", () => {
    // 권한 표의 키가 메뉴 id 와 어긋나면 그 메뉴가 조용히 모두에게 열린다.
    const hiddenForGeneral = getVisibleNavItems({ canSeeStats: false, canManageDocumentTemplates: false }).map(
      (item) => item.id,
    );
    const visibleForCounsel = getVisibleNavItems({ canSeeStats: true, canManageDocumentTemplates: true }).map(
      (item) => item.id,
    );
    const gated = visibleForCounsel.filter((id) => !hiddenForGeneral.includes(id));

    expect(gated.length).toBeGreaterThan(0);
    gated.forEach((id) => {
      expect(NAV_ITEMS.some((item) => item.id === id)).toBe(true);
    });
  });
});
