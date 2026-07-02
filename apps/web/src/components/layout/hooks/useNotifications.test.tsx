import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  NotificationDto,
  ListNotificationsResponse,
} from "@lawai/contracts";
import { useNotifications } from "./useNotifications";
import * as api from "../../../api/notifications";

vi.mock("../../../api/notifications");

const noti = (over: Partial<NotificationDto> = {}): NotificationDto => ({
  id: "n-1",
  type: "comment_mention",
  actorId: "a-1",
  actorName: "홍길동",
  targetType: "Comment",
  targetId: "c-1",
  detail: { contractId: "k-1", preview: "본문" },
  isRead: false,
  createdAt: "2026-06-22T02:00:00.000Z",
  ...over,
});

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("query.data에서 notifications/unreadCount를 파생한다", async () => {
    const response: ListNotificationsResponse = {
      items: [noti()],
      unreadCount: 1,
    };
    vi.mocked(api.listNotifications).mockResolvedValue(response);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].actorName).toBe("홍길동");
  });

  it("로딩 전 기본값은 빈 목록 + unreadCount 0", () => {
    vi.mocked(api.listNotifications).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNotifications(), {
      wrapper: wrapper(),
    });
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markRead 호출 시 api.markNotificationRead를 호출하고 쿼리를 무효화(재조회)한다", async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [noti()],
      unreadCount: 1,
    });
    vi.mocked(api.markNotificationRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await result.current.markRead("n-1");
    expect(api.markNotificationRead).toHaveBeenCalledWith("n-1");
    await waitFor(() =>
      expect(api.listNotifications).toHaveBeenCalledTimes(2),
    );
  });

  it("markAllRead 호출 시 api.markAllNotificationsRead를 호출한다", async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [],
      unreadCount: 0,
    });
    vi.mocked(api.markAllNotificationsRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.markAllRead();
    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });
});
