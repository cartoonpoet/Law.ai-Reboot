import { describe, it, expect } from "vitest";
import { ApiError, getErrorMessage, getErrorStatus, toResponseError } from "./apiError";

describe("toResponseError", () => {
  it("서버 message 와 상태코드를 담고 Error 로도 취급된다", async () => {
    const error = await toResponseError(new Response(JSON.stringify({ message: "권한이 없습니다" }), { status: 403 }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
    expect(error.message).toBe("권한이 없습니다");
  });

  it("검증 오류 message 배열은 이어 붙인다", async () => {
    const error = await toResponseError(
      new Response(JSON.stringify({ message: ["email must be an email", "password too short"] }), { status: 400 }),
    );
    expect(error.message).toBe("email must be an email, password too short");
  });

  it("바디가 없으면 상태코드 문구로 대신한다", async () => {
    const error = await toResponseError(new Response("", { status: 502 }));
    expect(error.status).toBe(502);
    expect(error.message).toBe("요청 실패 (502)");
  });
});

describe("getErrorStatus / getErrorMessage", () => {
  it("ApiError 만 상태코드를 돌려주고, 일반 Error 는 null", () => {
    expect(getErrorStatus(new ApiError(404, "없음"))).toBe(404);
    expect(getErrorStatus(new Error("boom"))).toBeNull();
    expect(getErrorStatus("문자열")).toBeNull();
  });

  it("message 가 비었거나 Error 가 아니면 fallback", () => {
    expect(getErrorMessage(new Error("실패"), "기본")).toBe("실패");
    expect(getErrorMessage(new Error(""), "기본")).toBe("기본");
    expect(getErrorMessage({ message: "객체" }, "기본")).toBe("기본");
  });
});
