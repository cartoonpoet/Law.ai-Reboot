import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  login,
  signup,
  getMe,
  requestOtp,
  verifyOtp,
  requestPasswordReset,
  confirmPasswordReset,
} from "./auth";

const BASE = "http://localhost:3000";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("auth api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("login은 /auth/login으로 POST하고 토큰을 반환한다", async () => {
    const fetchMock = mockFetch({
      user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    const res = await login({ email: "a@b.com", password: "password123" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/auth/login`, expect.objectContaining({ method: "POST" }));
    expect(res.tokens.accessToken).toBe("at");
  });

  it("signup은 에러 응답 시 throw한다", async () => {
    mockFetch({ message: "이미 존재" }, false, 400);
    await expect(
      signup({ email: "a@b.com", name: "A", password: "password123" }),
    ).rejects.toThrow("이미 존재");
  });

  it("getMe는 /users/me로 GET하고 토큰 헤더를 붙인다", async () => {
    localStorage.setItem("accessToken", "tok123");
    const fetchMock = mockFetch({ id: "u1", email: "a@b.com", name: "A", createdAt: "x" });
    const me = await getMe();
    expect(me.email).toBe("a@b.com");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/users/me`);
    expect(opts.method).toBeUndefined();
    expect(opts.headers.Authorization).toBe("Bearer tok123");
  });

  it("requestOtp는 /auth/otp/request로 POST", async () => {
    const fetchMock = mockFetch({ sent: true });
    const r = await requestOtp({ phone: "01012345678" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/auth/otp/request`, expect.objectContaining({ method: "POST" }));
    expect(r.sent).toBe(true);
  });

  it("verifyOtp는 /auth/otp/verify로 POST하고 토큰을 반환한다", async () => {
    const fetchMock = mockFetch({
      user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    const res = await verifyOtp({ phone: "01012345678", code: "123456" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/auth/otp/verify`, expect.objectContaining({ method: "POST" }));
    expect(res.tokens.refreshToken).toBe("rt");
  });

  it("requestPasswordReset는 /auth/password/reset-request로 POST", async () => {
    const fetchMock = mockFetch({ ok: true });
    await requestPasswordReset({ email: "a@b.com" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/auth/password/reset-request`, expect.objectContaining({ method: "POST" }));
  });

  it("confirmPasswordReset는 /auth/password/reset-confirm로 POST", async () => {
    const fetchMock = mockFetch({ ok: true });
    await confirmPasswordReset({ token: "t", newPassword: "password123" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/auth/password/reset-confirm`, expect.objectContaining({ method: "POST" }));
  });
});
