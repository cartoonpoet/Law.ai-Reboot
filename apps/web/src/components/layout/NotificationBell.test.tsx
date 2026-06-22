import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotificationDto } from "@lawai/contracts";
import { NotificationBell } from "./NotificationBell";
import { useNotifications } from "./hooks/useNotifications";

// useNotifications 훅을 목으로 대체(refetchInterval 폴링 영향 차단 — 결정적 렌더 테스트).
vi.mock("./hooks/useNotifications");

const noti = (over: Partial<NotificationDto> = {}): NotificationDto => ({
  id: "n-1",
  type: "comment_mention",
  actorId: "a-1",
  actorName: "홍길동",
  targetType: "Comment",
  targetId: "c-1",
  detail: { contractId: "k-1", preview: "검토 부탁드립니다" },
  isRead: false,
  createdAt: "2026-06-22T02:00:00.000Z",
  ...over,
});

const mockHook = (over: Partial<ReturnType<typeof useNotifications>> = {}) => {
  const markRead = vi.fn().mockResolvedValue(undefined);
  const markAllRead = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useNotifications).mockReturnValue({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markRead,
    markAllRead,
    ...over,
  });
  return { markRead, markAllRead };
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <NotificationBell />
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unreadCount가 0이면 배지를 표시하지 않는다", () => {
    mockHook({ unreadCount: 0 });
    renderBell();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("unreadCount > 0이면 배지에 카운트를 표시한다", () => {
    mockHook({ unreadCount: 3 });
    renderBell();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("99 초과 카운트는 99+로 캡한다", () => {
    mockHook({ unreadCount: 150 });
    renderBell();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("초기엔 드롭다운이 닫혀 있고 벨 클릭 시 열린다", async () => {
    const user = userEvent.setup();
    mockHook({ notifications: [noti()], unreadCount: 1 });
    renderBell();
    expect(screen.queryByText("검토 부탁드립니다")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "알림" }));
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("검토 부탁드립니다")).toBeInTheDocument();
  });

  it("알림이 없으면 빈 상태 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockHook({ notifications: [], unreadCount: 0 });
    renderBell();
    await user.click(screen.getByRole("button", { name: "알림" }));
    expect(screen.getByText("새 알림이 없습니다.")).toBeInTheDocument();
  });

  it("항목 클릭 시 해당 계약으로 navigate하고 markRead를 호출한다", async () => {
    const user = userEvent.setup();
    const { markRead } = mockHook({ notifications: [noti()], unreadCount: 1 });
    renderBell();
    await user.click(screen.getByRole("button", { name: "알림" }));
    await user.click(screen.getByText("홍길동"));

    expect(markRead).toHaveBeenCalledWith("n-1");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/contract/k-1"),
    );
  });

  it("'모두 읽음' 클릭 시 markAllRead를 호출한다", async () => {
    const user = userEvent.setup();
    const { markAllRead } = mockHook({
      notifications: [noti()],
      unreadCount: 1,
    });
    renderBell();
    await user.click(screen.getByRole("button", { name: "알림" }));
    await user.click(screen.getByRole("button", { name: "모두 읽음" }));
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it("unreadCount가 0이면 '모두 읽음' 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    mockHook({ notifications: [noti({ isRead: true })], unreadCount: 0 });
    renderBell();
    await user.click(screen.getByRole("button", { name: "알림" }));
    expect(screen.getByRole("button", { name: "모두 읽음" })).toBeDisabled();
  });
});
