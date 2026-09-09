import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { useTenantSwitcher } from "./useTenantSwitcher";
import { getMyTenants, switchTenant } from "../../../api/tenants";
import { setTokens } from "../../../api/tokens";

vi.mock("../../../api/tenants");
vi.mock("../../../api/tokens", () => ({ setTokens: vi.fn() }));

const memberships = [
  { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true },
  { tenantId: "t-2", name: "B테크", role: "outsideCounsel" as const, isActive: false },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useTenantSwitcher", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMyTenants).mockResolvedValue(memberships);
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("멤버십 목록과 활성 멤버십을 반환한다", async () => {
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));
    expect(result.current.activeMembership?.tenantId).toBe("t-1");
  });

  it("switchTo 성공 시 새 토큰을 저장하고 루트로 전체 새로고침한다", async () => {
    vi.mocked(switchTenant).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "newAt", refreshToken: "newRt" },
    });
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(setTokens).toHaveBeenCalledWith("newAt", "newRt"));
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  it("switchTo 실패 시 isSwitchError가 true가 되고 새로고침하지 않는다", async () => {
    vi.mocked(switchTenant).mockRejectedValue(new Error("해당 테넌트의 멤버가 아닙니다"));
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(result.current.isSwitchError).toBe(true));
    expect(setTokens).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("전환 진행 중에는 switchingTenantId가 대상 id를 가리킨다", async () => {
    // resolve 를 지연시켜 pending 상태를 관찰한다.
    let resolveSwitch!: (v: Awaited<ReturnType<typeof switchTenant>>) => void;
    vi.mocked(switchTenant).mockReturnValue(new Promise((r) => { resolveSwitch = r; }));
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(result.current.switchingTenantId).toBe("t-2"));
    resolveSwitch({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
  });
});
