import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNotificationStream } from "./useNotificationStream";
import { NOTIFICATIONS_QUERY_KEY } from "./useNotifications";

vi.mock("../../../api/client", () => ({
  getApiBaseUrl: () => "http://test-host:3000",
}));

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
});
