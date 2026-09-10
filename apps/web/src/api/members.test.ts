import { describe, it, expect, vi, beforeEach } from "vitest";
import { listTenantMembers, inviteMembers, resendInvite, cancelInvite } from "./members";

const BASE = "http://localhost:3000";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("members api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("listTenantMembers 는 /tenants/members 로 GET 한다", async () => {
    const fetchMock = mockFetch({ members: [], invites: [] });
    const res = await listTenantMembers();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/tenants/members`, expect.any(Object));
    expect(res).toEqual({ members: [], invites: [] });
  });

  it("inviteMembers 는 emails/role 을 POST 한다", async () => {
    const fetchMock = mockFetch({ sent: 2, skipped: [] });
    await inviteMembers({ emails: ["a@x.com", "b@x.com"], role: "general" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/tenants/invites`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emails: ["a@x.com", "b@x.com"], role: "general" }),
      }),
    );
  });

  it("resendInvite/cancelInvite 는 초대 id 경로를 호출한다", async () => {
    const fetchMock = mockFetch({ ok: true });
    await resendInvite("i1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/tenants/invites/i1/resend`,
      expect.objectContaining({ method: "POST" }),
    );
    await cancelInvite("i1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/tenants/invites/i1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
