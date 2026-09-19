import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommandPaletteProvider } from "../search/CommandPaletteProvider";
import { useCommandPalette } from "../search/useCommandPalette";
import { Sidebar } from "./Sidebar";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { useMe } from "./hooks/useMe";

vi.mock("./hooks/useTenantSwitcher");
vi.mock("./hooks/useMe");

const membership = { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true };

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// 사이드바 검색 버튼이 앱 틀의 검색창 상태를 여는지 보기 위한 표시.
function PaletteState() {
  const { isOpen } = useCommandPalette();
  return <div data-testid="palette">{isOpen ? "open" : "closed"}</div>;
}

function renderSidebar(initial = "/") {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <CommandPaletteProvider>
        <Sidebar />
        <PaletteState />
      </CommandPaletteProvider>
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.mocked(useTenantSwitcher).mockReturnValue({
      memberships: [membership],
      activeMembership: membership,
      isLoading: false, isError: false,
      switchTo: vi.fn(),
      switchingTenantId: null,
      isSwitchError: false,
    });
    vi.mocked(useMe).mockReturnValue({
      me: { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x", emailNotify: true, notifyApproval: true, notifyComment: true, notifyContractExpiry: true, avatarUrl: null },
      isPending: false,
      isError: false,
    });
  });

  it("주요 메뉴 라벨을 렌더한다", () => {
    renderSidebar();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
    expect(screen.getByText("시스템 관리")).toBeInTheDocument();
  });

  it("체결 전용 메뉴는 계약 조회로 흡수되어 노출되지 않는다", () => {
    renderSidebar();
    expect(screen.getByText("계약 조회")).toBeInTheDocument();
    expect(screen.queryByText("체결 계약 조회")).not.toBeInTheDocument();
    expect(screen.queryByText("체결계약 만료 현황")).not.toBeInTheDocument();
  });

  it("리프 메뉴 클릭 시 해당 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /법률자문 조회/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/advice/list");
  });

  it("계약 메뉴 클릭 시 그 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /계약 조회/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/list");
  });

  it("통합검색 버튼을 누르면 검색창이 열린다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    expect(screen.getByTestId("palette")).toHaveTextContent("closed");
    await user.click(screen.getByRole("button", { name: "통합검색 열기 (Ctrl K)" }));
    expect(screen.getByTestId("palette")).toHaveTextContent("open");
  });

  it("맨 아래 내 이름 영역에 이름과 현재 회사·역할을 표시한다", () => {
    renderSidebar();
    expect(screen.getByText("김지원")).toBeInTheDocument();
    expect(screen.getByText("A상사 · 사내변호사")).toBeInTheDocument();
  });

  it("사용자 정보 로딩 전에는 이름 없이 렌더가 깨지지 않는다", () => {
    vi.mocked(useMe).mockReturnValue({ me: null, isPending: false, isError: false });
    vi.mocked(useTenantSwitcher).mockReturnValue({
      memberships: [],
      activeMembership: null,
      isLoading: true, isError: false,
      switchTo: vi.fn(),
      switchingTenantId: null,
      isSwitchError: false,
    });
    renderSidebar();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 계정 메뉴" })).toBeInTheDocument();
  });
});
