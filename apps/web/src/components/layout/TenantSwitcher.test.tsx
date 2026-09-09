import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantSwitcher } from "./TenantSwitcher";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";

vi.mock("./hooks/useTenantSwitcher");

const m1 = { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true };
const m2 = { tenantId: "t-2", name: "B테크", role: "outsideCounsel" as const, isActive: false };

const mockHook = (over: Partial<ReturnType<typeof useTenantSwitcher>> = {}) => {
  const switchTo = vi.fn();
  vi.mocked(useTenantSwitcher).mockReturnValue({
    memberships: [m1, m2],
    activeMembership: m1,
    isLoading: false,
    switchTo,
    switchingTenantId: null,
    isSwitchError: false,
    ...over,
  });
  return { switchTo };
};

describe("TenantSwitcher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("멤버십 0개면 아무것도 렌더하지 않는다", () => {
    mockHook({ memberships: [], activeMembership: null });
    const { container } = render(<TenantSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it("멤버십 1개면 회사명만 표시하고 여는 버튼이 없다", () => {
    mockHook({ memberships: [m1] });
    render(<TenantSwitcher />);
    expect(screen.getByText("A상사")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /회사 전환/ })).not.toBeInTheDocument();
  });

  it("멤버십 2개+면 클릭 시 목록이 열리고 활성 회사에 체크가 표시된다", async () => {
    const user = userEvent.setup();
    mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByText("소속 회사 (2)")).toBeInTheDocument();
    expect(screen.getByText("B테크")).toBeInTheDocument();
    expect(screen.getByText("사외변호사")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A상사 사내변호사/ })).toHaveTextContent("✓");
  });

  it("비활성 회사 클릭 시 switchTo를 해당 tenantId로 호출한다", async () => {
    const user = userEvent.setup();
    const { switchTo } = mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    await user.click(screen.getByRole("button", { name: /B테크/ }));
    expect(switchTo).toHaveBeenCalledWith("t-2");
  });

  it("활성 회사 클릭 시 switchTo를 호출하지 않는다", async () => {
    const user = userEvent.setup();
    const { switchTo } = mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    await user.click(screen.getByRole("button", { name: /A상사 사내변호사/ }));
    expect(switchTo).not.toHaveBeenCalled();
  });

  it("전환 중에는 행 버튼이 비활성화되고 대상 행에 로딩이 표시된다", async () => {
    const user = userEvent.setup();
    mockHook({ switchingTenantId: "t-2" });
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByRole("button", { name: /B테크/ })).toBeDisabled();
    expect(screen.getByLabelText("전환 중")).toBeInTheDocument();
  });

  it("전환 실패 시 에러 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockHook({ isSwitchError: true });
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByText("회사 전환에 실패했습니다. 다시 시도해주세요.")).toBeInTheDocument();
  });
});
