import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMe } from "../layout/hooks/useMe";
import { AiAssistant } from "./AiAssistant";
import { ASSISTANT_COMMANDS, ASSISTANT_GREETING, ASSISTANT_POPUP } from "./assistantData";

vi.mock("../layout/hooks/useMe");

const ME = { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" };

const renderAssistant = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AiAssistant />
    </MemoryRouter>,
  );

describe("AiAssistant", () => {
  beforeEach(() => {
    vi.mocked(useMe).mockReturnValue({ me: ME });
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

  it("런처로 열면 홈에 지금 보고 있는 화면을 보여준다", async () => {
    const user = userEvent.setup();
    renderAssistant("/contract/list");
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    expect(screen.getByText(/보고 있는 화면: 계약 조회/)).toBeInTheDocument();
  });

  it("말풍선을 누르면 바로 대화로 들어간다", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByText(ASSISTANT_POPUP));
    expect(screen.getByText(ASSISTANT_GREETING.text)).toBeInTheDocument();
  });

  it("자주 시키는 일을 누르면 대화로 넘어가 준비된 답을 보여준다", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByRole("button", { name: "AI 비서 열기" }));
    await user.click(screen.getByRole("button", { name: ASSISTANT_COMMANDS[0].prompt }));
    expect(screen.getByText(ASSISTANT_COMMANDS[0].reply)).toBeInTheDocument();
  });

  it("입력창으로 보낸 메시지가 대화에 붙는다", async () => {
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByText(ASSISTANT_POPUP));
    await user.type(screen.getByRole("textbox", { name: "AI 비서에게 메시지" }), "다음 주 일정 알려줘");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByText("다음 주 일정 알려줘")).toBeInTheDocument();
  });
});
