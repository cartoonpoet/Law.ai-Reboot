import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
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

function renderSidebar(initial = "/") {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Sidebar />
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useTenantSwitcher).mockReturnValue({
      memberships: [membership],
      activeMembership: membership,
      isLoading: false,
      switchTo: vi.fn(),
      switchingTenantId: null,
      isSwitchError: false,
    });
    vi.mocked(useMe).mockReturnValue({
      me: { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
    });
  });

  it("주요 메뉴 라벨을 렌더한다", () => {
    renderSidebar();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
    expect(screen.getByText("시스템 관리")).toBeInTheDocument();
  });

  it("계약 하위 메뉴를 접힘 없이 바로 노출한다", () => {
    renderSidebar();
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
    expect(screen.getByText("계약서 검토 조회")).toBeInTheDocument();
    expect(screen.getByText("체결 계약 조회")).toBeInTheDocument();
    expect(screen.getByText("체결계약 만료 현황")).toBeInTheDocument();
  });

  it("리프 메뉴 클릭 시 해당 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /법률자문/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/advice");
  });

  it("계약 메뉴 클릭 시 그 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /계약서 검토 조회/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/list");
  });

  it("로그아웃 클릭 시 localStorage를 비우고 /login으로 이동한다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("accessToken", "tok");
    renderSidebar("/advice");
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it("foot에 실사용자 이름과 활성 테넌트 역할 라벨을 표시한다", () => {
    renderSidebar();
    expect(screen.getByText("김지원")).toBeInTheDocument();
    expect(screen.getByText("사내변호사")).toBeInTheDocument();
  });

  it("사용자 정보 로딩 전에는 foot 텍스트 없이 렌더가 깨지지 않는다", () => {
    vi.mocked(useMe).mockReturnValue({ me: null });
    vi.mocked(useTenantSwitcher).mockReturnValue({
      memberships: [],
      activeMembership: null,
      isLoading: true,
      switchTo: vi.fn(),
      switchingTenantId: null,
      isSwitchError: false,
    });
    renderSidebar();
    expect(screen.getByText("홈")).toBeInTheDocument();
  });

  it("스위처(현재 회사명)를 foot 위에 렌더한다", () => {
    renderSidebar();
    expect(screen.getByText("A상사")).toBeInTheDocument();
  });
});
