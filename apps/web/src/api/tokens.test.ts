import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from "./tokens";

vi.mock("./client", () => ({
  getApiBaseUrl: () => "http://test-host:3000",
}));

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("tokens", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("setTokens/getTokens/clearTokens 는 localStorage 키를 다룬다", () => {
    setTokens("a1", "r1");
    expect(getAccessToken()).toBe("a1");
    expect(getRefreshToken()).toBe("r1");

    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("refreshToken 이 없으면 즉시 reject 한다(fetch 미호출)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await expect(refreshAccessToken()).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("성공 시 setTokens 로 저장하고 새 access 를 반환한다", async () => {
    setTokens("oldA", "oldR");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        jsonResponse({ accessToken: "newA", refreshToken: "newR" }),
      );

    const access = await refreshAccessToken();

    expect(access).toBe("newA");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-host:3000/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "oldR" }),
      }),
    );
    // 슬라이딩 회전: access·refresh 둘 다 갱신.
    expect(getAccessToken()).toBe("newA");
    expect(getRefreshToken()).toBe("newR");
  });

  it("single-flight: 동시 2회 호출 시 fetch 는 1회만 실행된다", async () => {
    setTokens("oldA", "oldR");
    let resolveFetch!: (r: Response) => void;
    const fetchSpy = vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const p1 = refreshAccessToken();
    const p2 = refreshAccessToken();

    resolveFetch(jsonResponse({ accessToken: "newA", refreshToken: "newR" }));
    const [a1, a2] = await Promise.all([p1, p2]);

    expect(a1).toBe("newA");
    expect(a2).toBe("newA");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("401 응답이면 clearTokens 후 throw 한다", async () => {
    setTokens("oldA", "oldR");
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({}, false, 401),
    );

    await expect(refreshAccessToken()).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
