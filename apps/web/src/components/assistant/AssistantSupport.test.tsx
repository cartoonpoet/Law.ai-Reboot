import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationDto, SupportThreadDetail } from "@lawai/contracts";
import { createSupportThread, getSupportThread, listMySupportThreads } from "../../api/support";
import { useMe } from "../layout/hooks/useMe";
import { useNotifications } from "../layout/hooks/useNotifications";
import { AiAssistant } from "./AiAssistant";
import { AssistantProvider } from "./AssistantProvider";

vi.mock("../layout/hooks/useMe");
vi.mock("../layout/hooks/useNotifications");
// SSE 구독은 외부 시스템(EventSource) 의존 — 뷰 테스트에서는 no-op.
vi.mock("../layout/hooks/useNotificationStream", () => ({ useNotificationStream: vi.fn() }));
vi.mock("../../api/support");
vi.mock("../../api/assistant");

const ME = {
  id: "u1",
  email: "a@b.com",
  name: "김지원",
  isSystemAdmin: false,
  departmentId: null,
  departmentName: null,
  createdAt: "x",
  emailNotify: true,
  notifyApproval: true,
  notifyComment: true,
  notifyContractExpiry: true,
  avatarUrl: null,
};

const THREAD: SupportThreadDetail = {
  id: "s1",
  subject: "계약 상세 오류",
  status: "answered",
  context: { path: "/contract/k-1", screen: "계약 상세", errorMessage: "서버 오류" },
  lastMessageAt: "2026-09-16T02:00:00.000Z",
  createdAt: "2026-09-16T01:00:00.000Z",
  lastMessagePreview: "확인 후 고쳤습니다",
  lastMessageRole: "admin",
  messages: [
    {
      id: "m1",
      authorId: "u1",
      authorRole: "user",
      authorName: "김지원",
      body: "계약을 열면 오류가 나요",
      createdAt: "2026-09-16T01:00:00.000Z",
    },
    {
      id: "m2",
      authorId: "admin1",
      authorRole: "admin",
      authorName: "고객지원",
      body: "확인 후 고쳤습니다",
      createdAt: "2026-09-16T02:00:00.000Z",
    },
  ],
};

const mockNotifications = (over: Partial<ReturnType<typeof useNotifications>> = {}) => {
  const markRead = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useNotifications).mockReturnValue({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markRead,
    markAllRead: vi.fn().mockResolvedValue(undefined),
    ...over,
  });
  return { markRead };
};

const renderAssistant = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/contract/k-1"]}>
        <AssistantProvider>
          <AiAssistant />
        </AssistantProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const openSupportTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
  await user.click(
    within(screen.getByRole("navigation", { name: "AI 비서 메뉴" })).getByRole("button", { name: /문의/ }),
  );
};

describe("AI 비서 — 문의", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMe).mockReturnValue({ me: ME });
    mockNotifications();
    vi.mocked(listMySupportThreads).mockResolvedValue({ threads: [], answeredCount: 0 });
    vi.mocked(getSupportThread).mockResolvedValue(THREAD);
  });

  it("남긴 문의가 없으면 안내하고, 새 문의를 보내면 그 문의를 연다", async () => {
    const user = userEvent.setup();
    vi.mocked(createSupportThread).mockResolvedValue(THREAD);
    renderAssistant();

    await openSupportTab(user);
    expect(await screen.findByText("아직 남긴 문의가 없어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "새 문의 남기기" }));
    await user.type(screen.getByLabelText("제목"), "계약 상세 오류");
    await user.type(screen.getByLabelText("내용"), "계약을 열면 오류가 나요");
    await user.click(screen.getByRole("button", { name: "문의 보내기" }));

    await waitFor(() =>
      expect(createSupportThread).toHaveBeenCalledWith({
        subject: "계약 상세 오류",
        body: "계약을 열면 오류가 나요",
        context: undefined,
      }),
    );
    // 보낸 뒤에는 그 문의의 주고받은 내용이 보인다.
    expect(await screen.findByText("확인 후 고쳤습니다")).toBeInTheDocument();
  });

  it("목록에서 문의를 고르면 주고받은 내용과 자동 첨부된 오류 정보를 보여준다", async () => {
    const user = userEvent.setup();
    vi.mocked(listMySupportThreads).mockResolvedValue({
      threads: [
        {
          id: "s1",
          subject: "계약 상세 오류",
          status: "answered",
          context: null,
          lastMessageAt: "2026-09-16T02:00:00.000Z",
          createdAt: "2026-09-16T01:00:00.000Z",
          lastMessagePreview: "확인 후 고쳤습니다",
          lastMessageRole: "admin",
        },
      ],
      answeredCount: 1,
    });
    renderAssistant();

    await openSupportTab(user);
    await user.click(await screen.findByRole("button", { name: /계약 상세 오류/ }));

    expect(await screen.findByText("계약을 열면 오류가 나요")).toBeInTheDocument();
    expect(screen.getByText("주소: /contract/k-1")).toBeInTheDocument();
    expect(getSupportThread).toHaveBeenCalledWith("s1");
  });

  it("문의 답변 알림을 누르면 화면 이동 없이 그 문의를 연다", async () => {
    const user = userEvent.setup();
    const reply: NotificationDto = {
      id: "n-1",
      type: "support_reply",
      actorId: "admin1",
      actorName: "고객지원",
      targetType: "SupportThread",
      targetId: "s1",
      detail: { threadId: "s1", subject: "계약 상세 오류", preview: "확인 후 고쳤습니다" },
      isRead: false,
      isTargetDeleted: false,
      createdAt: "2026-09-16T02:00:00.000Z",
    };
    const { markRead } = mockNotifications({ notifications: [reply], unreadCount: 1 });
    renderAssistant();

    await user.click(screen.getByRole("button", { name: "AI 비서 열기, 안 읽은 알림 1건" }));
    await user.click(
      within(screen.getByRole("navigation", { name: "AI 비서 메뉴" })).getByRole("button", { name: /알림/ }),
    );
    await user.click(screen.getByText("문의에 답변이 달렸어요"));

    await waitFor(() => expect(getSupportThread).toHaveBeenCalledWith("s1"));
    expect(markRead).toHaveBeenCalledWith("n-1");
    expect(await screen.findByText("확인 후 고쳤습니다")).toBeInTheDocument();
  });
});
