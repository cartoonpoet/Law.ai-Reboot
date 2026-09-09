import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyTenants, switchTenant } from "./tenants";

const BASE = "http://localhost:3000";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const membership = {
  tenantId: "t-1",
  name: "A상사",
  role: "inHouseCounsel",
  isActive: true,
};

describe("tenants api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("getMyTenants는 /auth/me/tenants로 GET하고 tenants 배열을 언래핑해 반환한다", async () => {
    localStorage.setItem("accessToken", "tok123");
    const fetchMock = mockFetch({ tenants: [membership] });
    const res = await getMyTenants();
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/me/tenants`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
      }),
    );
    expect(res).toEqual([membership]);
  });

  it("switchTenant는 /auth/switch-tenant로 tenantId를 POST하고 새 토큰을 반환한다", async () => {
    const fetchMock = mockFetch({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "newAt", refreshToken: "newRt" },
    });
    const res = await switchTenant("t-2");
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/switch-tenant`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ tenantId: "t-2" }) }),
    );
    expect(res.tokens.accessToken).toBe("newAt");
  });

  it("switchTenant는 403 응답 시 서버 메시지로 throw한다", async () => {
    mockFetch({ message: "해당 테넌트의 멤버가 아닙니다" }, false, 403);
    await expect(switchTenant("t-x")).rejects.toThrow("해당 테넌트의 멤버가 아닙니다");
  });
});
