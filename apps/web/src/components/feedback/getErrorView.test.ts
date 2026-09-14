import { describe, it, expect } from "vitest";
import { ApiError, NETWORK_ERROR_MESSAGE, NETWORK_ERROR_STATUS } from "../../api/apiError";
import { getErrorView } from "./getErrorView";

describe("getErrorView", () => {
  it("403 은 권한 없음, 다시 시도 없음, 서버 사유 표시", () => {
    const view = getErrorView(new ApiError(403, "계약 조회 권한이 없습니다"));
    expect(view).toMatchObject({ kind: "forbidden", title: "접근 권한이 없어요", canRetry: false, detail: "계약 조회 권한이 없습니다" });
  });

  it("404 는 찾을 수 없음, 다시 시도 없음", () => {
    expect(getErrorView(new ApiError(404, ""))).toMatchObject({ kind: "notFound", canRetry: false, detail: null });
  });

  it("네트워크 실패는 연결 불가, 다시 시도 가능", () => {
    expect(getErrorView(new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE))).toMatchObject({
      kind: "network",
      canRetry: true,
      detail: null,
    });
  });

  it("5xx 는 일시적 오류, 다시 시도 가능", () => {
    expect(getErrorView(new ApiError(500, "Internal server error"))).toMatchObject({ kind: "server", canRetry: true });
  });

  it("렌더 크래시 같은 일반 Error 는 서버 오류로 보되 내부 메시지는 노출하지 않는다", () => {
    const view = getErrorView(new TypeError("Cannot read properties of undefined"));
    expect(view).toMatchObject({ kind: "server", canRetry: true, detail: null });
  });
});
