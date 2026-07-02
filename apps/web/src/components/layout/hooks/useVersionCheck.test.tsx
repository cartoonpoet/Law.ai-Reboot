import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useVersionCheck } from "./useVersionCheck";

/**
 * useVersionCheck — /version.json 폴링 결과가 __BUILD_ID__ 와 다르면 true.
 *
 * vitest 도 vite 의 define 으로 __BUILD_ID__ 가 컴파일 타임 치환되므로, 같은 값/다른 값
 * 응답을 mock 해 결과를 검증한다. 폴링 타이머·visibility 동작은 react-query 내장이라 단위
 * 테스트에서는 fetch mock 1회 호출로도 충분.
 */
const renderUseVersionCheck = () => {
  // gcTime=0 + retry=false 로 테스트 격리(이전 테스트 캐시 잔재 방지).
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useVersionCheck(), { wrapper });
};

const stubFetchVersion = (payload: { buildId: string }) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    }),
  );
};

describe("useVersionCheck", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("응답 buildId 가 __BUILD_ID__ 와 같으면 false", async () => {
    stubFetchVersion({ buildId: __BUILD_ID__ });
    const { result } = renderUseVersionCheck();
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("응답 buildId 가 __BUILD_ID__ 와 다르면 true", async () => {
    stubFetchVersion({ buildId: "different-build-id" });
    const { result } = renderUseVersionCheck();
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("fetch 실패면 false 유지(다음 폴링에서 회복)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const { result } = renderUseVersionCheck();
    // 잠시 기다려도 true 가 되지 않아야 한다(data 가 set 안 됨).
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current).toBe(false);
  });
});
