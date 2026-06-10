import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, signup } from "./auth";

describe("auth api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("login은 /auth/login으로 POST하고 토큰을 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
        tokens: { accessToken: "at", refreshToken: "rt" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await login({ email: "a@b.com", password: "password123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(res.tokens.accessToken).toBe("at");
  });

  it("signup은 에러 응답 시 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "이미 존재" }),
      }),
    );
    await expect(
      signup({ email: "a@b.com", name: "A", password: "password123" }),
    ).rejects.toThrow("이미 존재");
  });
});
