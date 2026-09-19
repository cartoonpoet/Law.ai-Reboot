import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileMenu } from "./ProfileMenu";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { useMe } from "./hooks/useMe";

vi.mock("./hooks/useTenantSwitcher");
vi.mock("./hooks/useMe");

const m1 = { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true };
const m2 = { tenantId: "t-2", name: "B테크", role: "outsideCounsel" as const, isActive: false };

const mockTenants = (over: Partial<ReturnType<typeof useTenantSwitcher>> = {}) => {
  const switchTo = vi.fn();
  vi.mocked(useTenantSwitcher).mockReturnValue({
    memberships: [m1, m2],
    activeMembership: m1,
    isLoading: false, isError: false,
    switchTo,
    switchingTenantId: null,
    isSwitchError: false,
    ...over,
  });
  return { switchTo };
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderMenu = async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <ProfileMenu />
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "내 계정 메뉴" }));
  return user;
};

describe("ProfileMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useMe).mockReturnValue({
      me: { id: "u1", email: "kim@lawai.kr", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x", emailNotify: true, notifyApproval: true, notifyComment: true, notifyContractExpiry: true, avatarUrl: null },
      isPending: false,
      isError: false,
    });
  });

  it("누르기 전엔 닫혀 있고, 누르면 이름·이메일과 설정·로그아웃이 보인다", async () => {
    mockTenants({ memberships: [m1] });
    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "내 계정 메뉴" }));
    expect(screen.getByText("kim@lawai.kr")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "설정" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("시스템 관리자가 아니면 관리자 콘솔 입구가 없다", async () => {
    mockTenants({ memberships: [m1] });
    await renderMenu();
    expect(screen.queryByRole("menuitem", { name: /관리자 콘솔/ })).not.toBeInTheDocument();
  });

  it("시스템 관리자는 관리자 콘솔을 새 탭으로 연다", async () => {
    mockTenants({ memberships: [m1] });
    vi.mocked(useMe).mockReturnValue({
      me: { id: "u1", email: "kim@lawai.kr", name: "김지원", isSystemAdmin: true, departmentId: null, departmentName: null, createdAt: "x", emailNotify: true, notifyApproval: true, notifyComment: true, notifyContractExpiry: true, avatarUrl: null },
      isPending: false,
      isError: false,
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const user = await renderMenu();
    await user.click(screen.getByRole("menuitem", { name: /관리자 콘솔/ }));

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("localhost:5175"), "_blank", "noopener");
    openSpy.mockRestore();
  });

  it("프로필 사진이 있으면 이름 첫 글자 대신 사진을 보여준다", () => {
    mockTenants({ memberships: [m1] });
    vi.mocked(useMe).mockReturnValue({
      me: { id: "u1", email: "kim@lawai.kr", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x", emailNotify: true, notifyApproval: true, notifyComment: true, notifyContractExpiry: true, avatarUrl: "/users/u1/avatar/a.png" },
      isPending: false,
      isError: false,
    });
    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    // 옆에 이름이 보이므로 사진은 장식(alt="")으로 두고, 화면 낭독기에는 이름만 읽힌다.
    const photo = document.querySelector('img[src*="/users/u1/avatar/a.png"]');
    expect(photo).not.toBeNull();
    expect(photo).toHaveAttribute("alt", "");
  });

  it("소속 회사가 1곳이면 회사 전환을 보여주지 않는다", async () => {
    mockTenants({ memberships: [m1] });
    await renderMenu();
    expect(screen.queryByText(/회사 전환/)).not.toBeInTheDocument();
  });

  it("설정을 누르면 시스템 관리가 아니라 내 정보 설정으로 이동하고 메뉴가 닫힌다", async () => {
    mockTenants();
    const user = await renderMenu();
    await user.click(screen.getByRole("menuitem", { name: "설정" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/settings/profile");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("로그아웃을 누르면 토큰을 지우고 로그인으로 이동한다", async () => {
    mockTenants();
    localStorage.setItem("accessToken", "tok");
    const user = await renderMenu();
    await user.click(screen.getByRole("menuitem", { name: "로그아웃" }));
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it("소속 2곳 이상이면 회사 목록을 보여주고 현재 회사에 체크한다", async () => {
    mockTenants();
    await renderMenu();
    expect(screen.getByText("회사 전환 (2)")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /A상사/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: /B테크 사외변호사/ })).toHaveAttribute("aria-checked", "false");
  });

  it("다른 회사를 누르면 그 회사로 전환하고, 현재 회사를 누르면 아무것도 하지 않는다", async () => {
    const { switchTo } = mockTenants();
    const user = await renderMenu();
    await user.click(screen.getByRole("menuitemradio", { name: /A상사/ }));
    expect(switchTo).not.toHaveBeenCalled();
    await user.click(screen.getByRole("menuitemradio", { name: /B테크/ }));
    expect(switchTo).toHaveBeenCalledWith("t-2");
  });

  it("전환 중이면 회사 행이 비활성이고 대상 행에 로딩을 표시한다", async () => {
    mockTenants({ switchingTenantId: "t-2" });
    await renderMenu();
    expect(screen.getByRole("menuitemradio", { name: /B테크/ })).toBeDisabled();
    expect(screen.getByLabelText("전환 중")).toBeInTheDocument();
  });

  it("전환에 실패하면 안내 문구를 보여준다", async () => {
    mockTenants({ isSwitchError: true });
    await renderMenu();
    expect(screen.getByText("회사 전환에 실패했습니다. 다시 시도해주세요.")).toBeInTheDocument();
  });
});
