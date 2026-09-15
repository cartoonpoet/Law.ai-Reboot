import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationDto } from "@lawai/contracts";
import { chatWithAssistant } from "../../api/assistant";
import { updateContractStatus } from "../../api/contracts";
import { useMe } from "../layout/hooks/useMe";
import { useNotifications } from "../layout/hooks/useNotifications";
import { AiAssistant } from "./AiAssistant";
import { AssistantProvider } from "./AssistantProvider";
import { ASSISTANT_GREETING, ASSISTANT_POPUP, ASSISTANT_SUGGESTIONS } from "./assistantData";
import { getToasts } from "../../lib/toast/toastStore";

vi.mock("../layout/hooks/useMe");
vi.mock("../layout/hooks/useNotifications");
// SSE 구독은 외부 시스템(EventSource) 의존 — 뷰 테스트에서는 no-op.
vi.mock("../layout/hooks/useNotificationStream", () => ({ useNotificationStream: vi.fn() }));
vi.mock("../../api/assistant");
vi.mock("../../api/contracts");

const ME = { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x", emailNotify: true, notifyApproval: true, notifyComment: true, avatarUrl: null };

const noti = (over: Partial<NotificationDto> = {}): NotificationDto => ({
  id: "n-1",
  type: "comment_mention",
  actorId: "a-1",
  actorName: "홍길동",
  targetType: "Comment",
  targetId: "c-1",
  detail: { contractId: "k-1", preview: "검토 부탁드립니다" },
  isRead: false,
  isTargetDeleted: false,
  createdAt: "2026-06-22T02:00:00.000Z",
  ...over,
});

const mockNotifications = (over: Partial<ReturnType<typeof useNotifications>> = {}) => {
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

const renderAssistant = (path = "/") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AssistantProvider>
          <AiAssistant />
        </AssistantProvider>
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const getBottomNav = () => within(screen.getByRole("navigation", { name: "AI 비서 메뉴" }));

describe("AiAssistant", () => {
  beforeEach(() => {
    vi.mocked(useMe).mockReturnValue({ me: ME });
    vi.mocked(chatWithAssistant).mockReset();
    vi.mocked(updateContractStatus).mockReset();
    mockNotifications();
  });

  it("홈 인사에 로그인 사용자 이름을 쓰고, 불러오기 전엔 이름 없이 인사한다", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAssistant();
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    expect(screen.getByText(/안녕하세요, 김지원 님/)).toBeInTheDocument();
    unmount();

    vi.mocked(useMe).mockReturnValue({ me: null });
    renderAssistant();
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    expect(screen.getByRole("heading", { name: /^안녕하세요\s*무엇을 도와드릴까요\?$/ })).toBeInTheDocument();
  });

  it("닫혀 있을 때 먼저 말 거는 말풍선을 띄우고, 닫으면 사라진다", async () => {
    const user = userEvent.setup();
    renderAssistant();
    expect(screen.getByText(ASSISTANT_POPUP)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "말풍선 닫기" }));
    expect(screen.queryByText(ASSISTANT_POPUP)).not.toBeInTheDocument();
  });

  it("런처로 열면 홈에 지금 보고 있는 화면을 보여주고, 대화 전엔 최근 대화가 없다", async () => {
    const user = userEvent.setup();
    renderAssistant("/contract/list");
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    expect(screen.getByText(/보고 있는 화면: 계약 조회/)).toBeInTheDocument();
    expect(screen.queryByText("최근 대화")).not.toBeInTheDocument();
  });

  it("말풍선을 누르면 바로 대화로 들어간다", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByText(ASSISTANT_POPUP));
    expect(screen.getByText(ASSISTANT_GREETING.text)).toBeInTheDocument();
  });

  it("추천 질문을 누르면 화면 이름과 함께 실제 AI 에 묻고 답을 보여준다", async () => {
    const user = userEvent.setup();
    vi.mocked(chatWithAssistant).mockResolvedValue({ reply: "처리할 일은 2건이에요.", actions: [], needsSetup: false });
    renderAssistant("/approvals/inbox");
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    await user.click(screen.getByRole("button", { name: ASSISTANT_SUGGESTIONS[0] }));
    expect(await screen.findByText("처리할 일은 2건이에요.")).toBeInTheDocument();
    expect(vi.mocked(chatWithAssistant).mock.calls[0][0]).toMatchObject({ screen: "결재 대기함" });
  });

  it("AI 가 배정을 제안하면 확인 카드로 받고, 배정하기를 눌러야 실행한다", async () => {
    const user = userEvent.setup();
    vi.mocked(chatWithAssistant).mockResolvedValue({
      reply: "김법무에게 배정할까요?",
      actions: [{ type: "assign", contractId: "c1", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" }],
      needsSetup: false,
    });
    vi.mocked(updateContractStatus).mockResolvedValue({} as never);
    renderAssistant();
    await user.click(screen.getByText(ASSISTANT_POPUP));
    await user.type(screen.getByRole("textbox", { name: "AI 비서에게 메시지" }), "미배정 계약 배정해줘");
    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText("'유지보수 계약' 계약을 김법무에게 배정할까요?")).toBeInTheDocument();
    expect(updateContractStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "배정하기" }));
    expect(await screen.findByText("'유지보수 계약' 계약을 김법무에게 배정했어요.")).toBeInTheDocument();
    expect(updateContractStatus).toHaveBeenCalledWith("c1", "assigning", "u-kim");
    expect(screen.getByText("완료했어요")).toBeInTheDocument();
  });

  it("취소를 누르면 실행하지 않는다", async () => {
    const user = userEvent.setup();
    vi.mocked(chatWithAssistant).mockResolvedValue({
      reply: "검토를 시작할까요?",
      actions: [{ type: "startReview", contractId: "c2", contractTitle: "공급 계약" }],
      needsSetup: false,
    });
    renderAssistant();
    await user.click(screen.getByText(ASSISTANT_POPUP));
    await user.click(screen.getByRole("button", { name: ASSISTANT_SUGGESTIONS[0] }));
    await user.click(await screen.findByRole("button", { name: "취소" }));
    expect(screen.getByText("취소했어요")).toBeInTheDocument();
    expect(updateContractStatus).not.toHaveBeenCalled();
  });

  describe("알림(헤더 알림 종 흡수)", () => {
    it("비서 버튼에 안 읽은 알림 수를 표시하고, 99 를 넘으면 99+ 로 줄인다", () => {
      mockNotifications({ unreadCount: 3 });
      const { unmount } = renderAssistant();
      expect(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 3건" })).toHaveTextContent("3");
      unmount();

      mockNotifications({ unreadCount: 150 });
      renderAssistant();
      expect(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 99+건" })).toHaveTextContent("99+");
    });

    it("안 읽은 알림이 없으면 비서 버튼에 숫자가 없고 홈에 알림 카드도 없다", async () => {
      const user = userEvent.setup();
      mockNotifications({ notifications: [noti({ isRead: true })], unreadCount: 0 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
      expect(screen.queryByRole("region", { name: "새 알림" })).not.toBeInTheDocument();
    });

    it("홈 맨 위 새 알림 카드는 안 읽은 알림만 최대 3건 보여주고, 전체 보기로 알림 화면을 연다", async () => {
      const user = userEvent.setup();
      const notifications = [
        noti({ id: "n-1", actorName: "가" }),
        noti({ id: "n-2", actorName: "나" }),
        noti({ id: "n-3", actorName: "다" }),
        noti({ id: "n-4", actorName: "라" }),
        noti({ id: "n-5", actorName: "읽은사람", isRead: true }),
      ];
      mockNotifications({ notifications, unreadCount: 4 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 4건" }));

      const card = within(screen.getByRole("region", { name: "새 알림" }));
      expect(card.getByText("가")).toBeInTheDocument();
      expect(card.getByText("다")).toBeInTheDocument();
      expect(card.queryByText("라")).not.toBeInTheDocument();
      expect(card.queryByText("읽은사람")).not.toBeInTheDocument();

      await user.click(card.getByRole("button", { name: "전체 보기" }));
      expect(screen.getByRole("heading", { name: "알림" })).toBeInTheDocument();
      expect(screen.getByText("라")).toBeInTheDocument();
      expect(screen.getByText("읽은사람")).toBeInTheDocument();
    });

    it("알림을 누르면 읽음 처리하고 그 계약 화면으로 이동하며 비서를 닫는다", async () => {
      const user = userEvent.setup();
      const { markRead } = mockNotifications({ notifications: [noti()], unreadCount: 1 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
      await user.click(within(screen.getByRole("region", { name: "새 알림" })).getByText("홍길동"));

      expect(markRead).toHaveBeenCalledWith("n-1");
      expect(screen.getByTestId("location")).toHaveTextContent("/contract/k-1");
      expect(screen.queryByRole("region", { name: "AI 비서" })).not.toBeInTheDocument();
    });

    it("삭제된 계약 알림은 삭제됨 안내를 보이고, 누르면 읽음 처리만 하고 이동하지 않는다", async () => {
      const user = userEvent.setup();
      const { markRead } = mockNotifications({ notifications: [noti({ isTargetDeleted: true })], unreadCount: 1 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
      const card = within(screen.getByRole("region", { name: "새 알림" }));
      expect(card.getByText("삭제된 계약이에요")).toBeInTheDocument();
      await user.click(card.getByText("홍길동"));

      expect(markRead).toHaveBeenCalledWith("n-1");
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
      expect(getToasts().map((toast) => toast.title)).toContain("삭제된 계약이라 열 수 없어요");
    });

    it("하단 알림 탭에서 모두 읽음을 누를 수 있고, 안 읽음 필터로 좁혀 본다", async () => {
      const user = userEvent.setup();
      const { markAllRead } = mockNotifications({
        notifications: [noti({ id: "n-1", actorName: "안읽은분" }), noti({ id: "n-2", actorName: "읽은분", isRead: true })],
        unreadCount: 1,
      });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
      await user.click(getBottomNav().getByRole("button", { name: /알림/ }));

      expect(screen.getByText("읽은분")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "모두 읽음" }));
      expect(markAllRead).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: "안 읽음 1" }));
      expect(screen.getByText("안읽은분")).toBeInTheDocument();
      expect(screen.queryByText("읽은분")).not.toBeInTheDocument();
    });

    it("알림 탭에서 결재·코멘트로 걸러 보고, 해당 알림이 없으면 빈 안내를 보여준다", async () => {
      const user = userEvent.setup();
      mockNotifications({
        notifications: [
          noti({ id: "n-1", type: "approval_turn", actorName: "결재올린분", detail: { contractId: "k-1" } }),
          noti({ id: "n-2", type: "comment_mention", actorName: "언급한분" }),
        ],
        unreadCount: 2,
      });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 2건" }));
      await user.click(getBottomNav().getByRole("button", { name: /알림/ }));
      const filters = within(screen.getByRole("group", { name: "알림 필터" }));

      await user.click(filters.getByRole("button", { name: "결재" }));
      expect(screen.getByText("결재올린분")).toBeInTheDocument();
      expect(screen.queryByText("언급한분")).not.toBeInTheDocument();

      await user.click(filters.getByRole("button", { name: "코멘트" }));
      expect(screen.getByText("언급한분")).toBeInTheDocument();
      expect(screen.queryByText("결재올린분")).not.toBeInTheDocument();
    });

    it("결재 알림은 무슨 알림인지와 품의 제목을 보여주고, 누르면 그 계약 화면으로 간다", async () => {
      const user = userEvent.setup();
      mockNotifications({
        notifications: [
          noti({ id: "n-9", type: "approval_turn", actorName: "한지원", detail: { targetType: "contract", targetId: "k-7", title: "공급계약 체결 품의" } }),
        ],
        unreadCount: 1,
      });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
      const card = within(screen.getByRole("region", { name: "새 알림" }));
      expect(card.getByText("결재 차례예요")).toBeInTheDocument();
      expect(card.getByText("공급계약 체결 품의")).toBeInTheDocument();

      await user.click(card.getByText("한지원"));
      expect(screen.getByTestId("location")).toHaveTextContent("/contract/k-7");
    });

    it("걸러 본 종류의 알림이 없으면 그 종류에 맞는 빈 안내를 보여준다", async () => {
      const user = userEvent.setup();
      mockNotifications({ notifications: [noti({ type: "comment_mention" })], unreadCount: 1 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
      await user.click(getBottomNav().getByRole("button", { name: /알림/ }));
      await user.click(within(screen.getByRole("group", { name: "알림 필터" })).getByRole("button", { name: "결재" }));
      expect(screen.getByText("결재 알림이 없어요.")).toBeInTheDocument();
    });

    it("안 읽은 알림이 없으면 모두 읽음이 비활성이고 안 읽음 필터에 빈 안내를 보여준다", async () => {
      const user = userEvent.setup();
      mockNotifications({ notifications: [noti({ isRead: true })], unreadCount: 0 });
      renderAssistant();
      await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
      await user.click(getBottomNav().getByRole("button", { name: /알림/ }));
      expect(screen.getByRole("button", { name: "모두 읽음" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "안 읽음 0" }));
      expect(screen.getByText("안 읽은 알림이 없어요.")).toBeInTheDocument();
    });
  });
});
