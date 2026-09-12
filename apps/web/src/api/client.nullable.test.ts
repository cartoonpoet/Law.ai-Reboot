import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetchNullable } from "./client";
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

function response(
  text: string,
  ok: boolean,
  status: number,
  jsonBody: unknown = {},
): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(jsonBody),
  } as unknown as Response;
}

const getRefreshToken = vi.mocked(tokens.getRefreshToken);
const getAccessToken = vi.mocked(tokens.getAccessToken);

describe("apiFetchNullable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockReturnValue("access");
    getRefreshToken.mockReturnValue(null);
  });

  it("빈 바디 응답이면 null을 반환한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(response("", true, 200));

    const result = await apiFetchNullable<{ data: string }>("/ai/my-credential");

    expect(result).toBeNull();
  });

  it("공백만 있는 바디도 null로 취급한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(response("   ", true, 200));

    const result = await apiFetchNullable<{ data: string }>("/ai/my-credential");

    expect(result).toBeNull();
  });

  it("실제 JSON 바디는 파싱해서 반환한다", async () => {
    const body = { data: "ok" };
    vi.spyOn(global, "fetch").mockResolvedValue(
      response(JSON.stringify(body), true, 200),
    );

    const result = await apiFetchNullable<{ data: string }>("/ai/my-credential");

    expect(result).toEqual(body);
  });

  it("non-ok 응답이면 apiFetch와 동일하게 throw 한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      response("", false, 500, { message: "서버 오류" }),
    );

    await expect(apiFetchNullable("/ai/my-credential")).rejects.toThrow(
      "서버 오류",
    );
  });
});
