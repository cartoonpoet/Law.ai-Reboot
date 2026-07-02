import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./client";
import * as tokens from "./tokens";

vi.mock("./tokens", async () => {
  const actual = await vi.importActual<typeof import("./tokens")>("./tokens");
  return {
    ...actual,
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
    refreshAccessToken: vi.fn(),
  };
});

function response(body: unknown, ok: boolean, status: number): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const getRefreshToken = vi.mocked(tokens.getRefreshToken);
const refreshAccessToken = vi.mocked(tokens.refreshAccessToken);
const clearTokens = vi.mocked(tokens.clearTokens);
const getAccessToken = vi.mocked(tokens.getAccessToken);

describe("apiFetch 401 인터셉터", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockReturnValue("access");
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/contracts", href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("401 + refreshToken 있으면 refresh 후 원요청을 1회 재시도해 성공한다", async () => {
    getRefreshToken.mockReturnValue("refresh");
    refreshAccessToken.mockResolvedValue("newAccess");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(response({}, false, 401))
      .mockResolvedValueOnce(response({ data: "ok" }, true, 200));

    const result = await apiFetch<{ data: string }>("/contracts");

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // 원요청 + 재시도 1회
    expect(result).toEqual({ data: "ok" });
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it("refresh 실패 시 clearTokens 후 /login?expired=1 로 이동하고 throw 한다", async () => {
    getRefreshToken.mockReturnValue("refresh");
    refreshAccessToken.mockRejectedValue(new Error("expired"));
    vi.spyOn(global, "fetch").mockResolvedValue(response({}, false, 401));

    await expect(apiFetch("/contracts")).rejects.toThrow();
    expect(clearTokens).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login?expired=1");
  });

  it("이미 /login 경로면 리다이렉트 없이 throw 만 한다", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/login", href: "" },
    });
    getRefreshToken.mockReturnValue("refresh");
    refreshAccessToken.mockRejectedValue(new Error("expired"));
    vi.spyOn(global, "fetch").mockResolvedValue(response({}, false, 401));

    await expect(apiFetch("/contracts")).rejects.toThrow();
    expect(clearTokens).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("");
  });

  it("refreshToken 없는 401 은 refresh/리다이렉트 없이 그대로 throw 한다", async () => {
    getRefreshToken.mockReturnValue(null);
    vi.spyOn(global, "fetch").mockResolvedValue(
      response({ message: "비밀번호 오류" }, false, 401),
    );

    await expect(apiFetch("/auth/login")).rejects.toThrow("비밀번호 오류");
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(clearTokens).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("재시도도 401 이면 재시도는 1회로 끝내고 throw 한다", async () => {
    getRefreshToken.mockReturnValue("refresh");
    refreshAccessToken.mockResolvedValue("newAccess");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(response({ message: "여전히 401" }, false, 401));

    await expect(apiFetch("/contracts")).rejects.toThrow("여전히 401");
    expect(fetchSpy).toHaveBeenCalledTimes(2); // 원요청 + 재시도 1회만
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
