import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatWithAssistant } from "../../api/assistant";
import { updateContractStatus } from "../../api/contracts";
import { useMe } from "../layout/hooks/useMe";
import { AiAssistant } from "./AiAssistant";
import { ASSISTANT_GREETING, ASSISTANT_POPUP, ASSISTANT_SUGGESTIONS } from "./assistantData";

vi.mock("../layout/hooks/useMe");
vi.mock("../../api/assistant");
vi.mock("../../api/contracts");

const ME = { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" };

const renderAssistant = (path = "/") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AiAssistant />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("AiAssistant", () => {
  beforeEach(() => {
    vi.mocked(useMe).mockReturnValue({ me: ME });
    vi.mocked(chatWithAssistant).mockReset();
    vi.mocked(updateContractStatus).mockReset();
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
});
