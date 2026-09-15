import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractSummary } from "@lawai/contracts";
import { chatWithAssistant } from "../../api/assistant";
import { listContracts } from "../../api/contracts";
import { AiAssistant } from "../assistant/AiAssistant";
import { AssistantProvider } from "../assistant/AssistantProvider";
import { useMe } from "../layout/hooks/useMe";
import { useNotifications } from "../layout/hooks/useNotifications";
import { CommandPalette } from "./CommandPalette";
import { CommandPaletteProvider } from "./CommandPaletteProvider";

vi.mock("../../api/contracts");
vi.mock("../../api/assistant");
vi.mock("../layout/hooks/useMe");
vi.mock("../layout/hooks/useNotifications");
vi.mock("../layout/hooks/useNotificationStream", () => ({ useNotificationStream: vi.fn() }));

const CONTRACT: ContractSummary = {
  id: "c1",
  code: "C20260912-4471",
  title: "삼성전자 비밀유지계약",
  status: "unassigned",
  securityLevel: "secure",
  party: null,
  categoryLabel: null,
  counterpartyName: "삼성전자(주)",
  requesterId: null,
  requesterName: null,
  ownerId: null,
  ownerName: null,
  dueDate: null,
  signedAt: null,
  createdById: "u1",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// 실제 앱 틀처럼 비서·검색창을 함께 띄워, 검색창 → 비서로 질문이 넘어가는지까지 본다.
const renderShell = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/"]}>
        <AssistantProvider>
          <CommandPaletteProvider>
            <CommandPalette />
            <AiAssistant />
          </CommandPaletteProvider>
        </AssistantProvider>
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const openPalette = async () => {
  const user = userEvent.setup();
  renderShell();
  await user.keyboard("{Control>}k{/Control}");
  return user;
};

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMe).mockReturnValue({ me: null });
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    });
    vi.mocked(listContracts).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5 });
  });

  it("Ctrl+K 로 열리고 입력칸에 바로 포커스가 가며, Esc 로 닫힌다", async () => {
    renderShell();
    const user = userEvent.setup();
    expect(screen.queryByRole("dialog", { name: "통합검색" })).not.toBeInTheDocument();
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog", { name: "통합검색" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "통합검색어" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "통합검색" })).not.toBeInTheDocument();
  });

  it("바깥(어두운 배경)을 누르면 닫힌다", async () => {
    const user = await openPalette();
    await user.click(screen.getByRole("button", { name: "통합검색 닫기" }));
    expect(screen.queryByRole("dialog", { name: "통합검색" })).not.toBeInTheDocument();
  });

  it("검색어를 입력하면 계약을 찾아 보여주고, Enter 로 첫 결과 계약을 연다", async () => {
    vi.mocked(listContracts).mockResolvedValue({ items: [CONTRACT], total: 1, page: 1, pageSize: 5 });
    const user = await openPalette();
    await user.type(screen.getByRole("combobox", { name: "통합검색어" }), "삼성");

    expect(await screen.findByText("삼성전자 비밀유지계약")).toBeInTheDocument();
    expect(listContracts).toHaveBeenCalledWith({ q: "삼성", pageSize: 5 });
    expect(screen.getByRole("option", { name: /삼성전자 비밀유지계약/ })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/c1");
    expect(screen.queryByRole("dialog", { name: "통합검색" })).not.toBeInTheDocument();
  });

  it("일치하는 계약이 없으면 안내하고, 이름이 맞는 메뉴를 눌러 이동한다", async () => {
    const user = await openPalette();
    await user.type(screen.getByRole("combobox", { name: "통합검색어" }), "결재");
    expect(await screen.findByText("일치하는 계약이 없어요")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "결재 대기함" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/approvals/inbox");
  });

  it("검색어가 없으면 바로 가기 메뉴를 보여주고, ↓ 로 선택을 옮긴다", async () => {
    const user = await openPalette();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(listContracts).not.toHaveBeenCalled();
  });

  it("Tab 을 누르면 입력한 문장을 AI 비서에게 질문으로 넘기고 대화를 연다", async () => {
    vi.mocked(chatWithAssistant).mockResolvedValue({ reply: "삼성 관련 계약은 3건이에요.", actions: [], needsSetup: false });
    const user = await openPalette();
    await user.type(screen.getByRole("combobox", { name: "통합검색어" }), "삼성 계약 알려줘");
    await user.keyboard("{Tab}");

    expect(screen.queryByRole("dialog", { name: "통합검색" })).not.toBeInTheDocument();
    expect(await screen.findByText("삼성 관련 계약은 3건이에요.")).toBeInTheDocument();
    expect(vi.mocked(chatWithAssistant).mock.calls[0][0].messages).toContainEqual({ role: "user", content: "삼성 계약 알려줘" });
  });

  it("검색어 없이 AI 비서에게 물어보기를 누르면 질문 없이 대화만 연다", async () => {
    const user = await openPalette();
    await user.click(screen.getByRole("option", { name: /AI 비서에게 물어보기/ }));
    expect(screen.getByRole("textbox", { name: "AI 비서에게 메시지" })).toBeInTheDocument();
    expect(chatWithAssistant).not.toHaveBeenCalled();
  });
});
