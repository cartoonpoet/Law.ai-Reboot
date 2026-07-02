import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNotificationStream } from "./useNotificationStream";
import { NOTIFICATIONS_QUERY_KEY } from "./useNotifications";
import * as tokens from "../../../api/tokens";

vi.mock("../../../api/client", () => ({
  getApiBaseUrl: () => "http://test-host:3000",
}));

// refreshAccessToken 만 목으로 갈아끼우고 나머지(getAccessToken 등)는 실제 사용.
vi.mock("../../../api/tokens", async () => {
  const actual =
    await vi.importActual<typeof import("../../../api/tokens")>(
      "../../../api/tokens",
    );
  return { ...actual, refreshAccessToken: vi.fn() };
});

const refreshAccessToken = vi.mocked(tokens.refreshAccessToken);

/**
 * EventSource 목 — 생성 URL 기록, onmessage/onerror 트리거 헬퍼, close 스파이.
 * jsdom 에는 EventSource 가 없으므로 global 에 주입한다.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  url: string;
  readyState = MockEventSource.OPEN;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  emitMessage() {
    this.onmessage?.(new MessageEvent("message", { data: "ping" }));
  }

  // 치명적 종료(CLOSED) 상태로 onerror 를 발화한다(토큰 만료 시뮬레이션).
  emitFatalError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event("error"));
  }
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useNotificationStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    localStorage.clear();
    refreshAccessToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("토큰이 있으면 ?token= 을 붙인 URL 로 EventSource 를 연다", () => {
    localStorage.setItem("accessToken", "tok 1&2");
    const queryClient = new QueryClient();

    renderHook(() => useNotificationStream(), {
      wrapper: wrapper(queryClient),
    });

    expect(MockEventSource.instances).toHaveLength(1);
    // base + /notifications/stream?token=<encoded>.
    expect(MockEventSource.instances[0].url).toBe(
      `http://test-host:3000/notifications/stream?token=${encodeURIComponent("tok 1&2")}`,
    );
  });

  it("토큰이 없으면 EventSource 를 만들지 않는다(미연결)", () => {
    const queryClient = new QueryClient();
    renderHook(() => useNotificationStream(), {
      wrapper: wrapper(queryClient),
    });
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("onmessage 수신 시 알림 쿼리를 invalidate 한다", () => {
    localStorage.setItem("accessToken", "tok");
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useNotificationStream(), {
      wrapper: wrapper(queryClient),
    });

    MockEventSource.instances[0].emitMessage();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: NOTIFICATIONS_QUERY_KEY,
    });
  });

  it("unmount 시 EventSource.close 를 호출한다", () => {
    localStorage.setItem("accessToken", "tok");
    const queryClient = new QueryClient();

    const { unmount } = renderHook(() => useNotificationStream(), {
      wrapper: wrapper(queryClient),
    });

    const es = MockEventSource.instances[0];
    expect(es.close).not.toHaveBeenCalled();

    unmount();
    expect(es.close).toHaveBeenCalledTimes(1);
  });

  it("CLOSED onerror 시 refresh 후 새 토큰으로 EventSource 를 재연결한다", async () => {
    localStorage.setItem("accessToken", "oldTok");
    refreshAccessToken.mockResolvedValue("newTok");
    const queryClient = new QueryClient();

    renderHook(() => useNotificationStream(), { wrapper: wrapper(queryClient) });

    expect(MockEventSource.instances).toHaveLength(1);
    MockEventSource.instances[0].emitFatalError();

    // refresh Promise 가 resolve 된 뒤 새 연결이 생성된다.
    await vi.waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(2);
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances[1].url).toBe(
      `http://test-host:3000/notifications/stream?token=${encodeURIComponent("newTok")}`,
    );
  });

  it("refresh 가 실패하면 재연결하지 않는다(EventSource 1회 생성)", async () => {
    localStorage.setItem("accessToken", "oldTok");
    refreshAccessToken.mockRejectedValue(new Error("expired"));
    const queryClient = new QueryClient();

    renderHook(() => useNotificationStream(), { wrapper: wrapper(queryClient) });

    MockEventSource.instances[0].emitFatalError();

    await vi.waitFor(() => {
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });
    // 재연결 없음.
    expect(MockEventSource.instances).toHaveLength(1);
  });
});
