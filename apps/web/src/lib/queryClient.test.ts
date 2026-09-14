import { describe, it, expect, beforeEach } from "vitest";
import { MutationObserver } from "@tanstack/react-query";
import { ApiError, NETWORK_ERROR_STATUS } from "../api/apiError";
import { MUTATION_ERROR_TITLE, QUERY_ERROR_TITLE, createQueryClient, shouldRetry, shouldThrowQueryError } from "./queryClient";
import type { AppQueryMeta } from "./queryClient";
import { getToasts, resetToasts } from "./toast/toastStore";

const failQuery = async (meta: AppQueryMeta | undefined, error: unknown, seed?: unknown) => {
  const client = createQueryClient();
  if (seed !== undefined) client.setQueryData(["k"], seed);
  await client
    .fetchQuery({ queryKey: ["k"], queryFn: () => Promise.reject(error), retry: false, meta })
    .catch(() => undefined);
};

describe("전역 쿼리 오류 처리", () => {
  beforeEach(() => resetToasts());

  it("기본 쿼리 실패는 서버 사유를 담아 토스트", async () => {
    await failQuery(undefined, new ApiError(400, "잘못된 요청입니다"));
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ intent: "error", title: QUERY_ERROR_TITLE, description: "잘못된 요청입니다" });
  });

  it("errorTitle 로 토스트 제목을 바꾼다", async () => {
    await failQuery({ errorTitle: "코멘트를 불러오지 못했어요" }, new ApiError(500, "서버 오류"));
    expect(getToasts()[0].title).toBe("코멘트를 불러오지 못했어요");
  });

  it("page 모드는 첫 조회 실패 시 토스트 없이 에러 경계로 던진다", async () => {
    await failQuery({ errorMode: "page" }, new ApiError(404, "계약을 찾을 수 없습니다"));
    expect(getToasts()).toEqual([]);
  });

  it("page 모드라도 이미 데이터가 있으면 화면은 두고 토스트만", async () => {
    await failQuery({ errorMode: "page" }, new ApiError(500, "서버 오류"), { id: "c1" });
    expect(getToasts()).toHaveLength(1);
  });

  it("silent 모드와 세션 만료(401)는 토스트하지 않는다", async () => {
    await failQuery({ errorMode: "silent" }, new ApiError(500, "서버 오류"));
    await failQuery(undefined, new ApiError(401, "세션이 만료되었습니다"));
    expect(getToasts()).toEqual([]);
  });
});

describe("전역 뮤테이션 오류 처리", () => {
  beforeEach(() => resetToasts());

  const failMutation = async (meta: AppQueryMeta | undefined) => {
    const client = createQueryClient();
    const observer = new MutationObserver(client, { mutationFn: () => Promise.reject(new ApiError(403, "권한이 없습니다")), meta });
    await observer.mutate().catch(() => undefined);
  };

  it("기본 뮤테이션 실패는 토스트(errorTitle 없으면 기본 제목)", async () => {
    await failMutation(undefined);
    expect(getToasts()[0]).toMatchObject({ title: MUTATION_ERROR_TITLE, description: "권한이 없습니다" });
  });

  it("errorTitle 적용, silent 는 생략", async () => {
    await failMutation({ errorTitle: "결재를 처리하지 못했어요" });
    await failMutation({ errorMode: "silent" });
    expect(getToasts().map((t) => t.title)).toEqual(["결재를 처리하지 못했어요"]);
  });
});

describe("shouldThrowQueryError", () => {
  const query = (meta: AppQueryMeta | undefined, data: unknown) => ({ meta, state: { data } }) as never;

  it("page 모드 + 데이터 없음 + 401 아님일 때만 던진다", () => {
    expect(shouldThrowQueryError(new ApiError(404, ""), query({ errorMode: "page" }, undefined))).toBe(true);
    expect(shouldThrowQueryError(new ApiError(404, ""), query({ errorMode: "page" }, { id: 1 }))).toBe(false);
    expect(shouldThrowQueryError(new ApiError(401, ""), query({ errorMode: "page" }, undefined))).toBe(false);
    expect(shouldThrowQueryError(new ApiError(500, ""), query(undefined, undefined))).toBe(false);
  });
});

describe("shouldRetry", () => {
  it("4xx 는 재시도하지 않고, 네트워크·5xx·알 수 없는 오류는 1회만", () => {
    expect(shouldRetry(0, new ApiError(404, ""))).toBe(false);
    expect(shouldRetry(0, new ApiError(500, ""))).toBe(true);
    expect(shouldRetry(1, new ApiError(500, ""))).toBe(false);
    expect(shouldRetry(0, new ApiError(NETWORK_ERROR_STATUS, ""))).toBe(true);
    expect(shouldRetry(0, new Error("parse"))).toBe(true);
  });
});
