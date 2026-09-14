import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatWithAssistant } from "../../api/assistant";
import { updateContractStatus } from "../../api/contracts";
import { ASSISTANT_SUGGESTIONS } from "./assistantData";
import { getActionKey, useAssistantChat } from "./useAssistantChat";

vi.mock("../../api/assistant");
vi.mock("../../api/contracts");

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

const ASSIGN = { type: "assign", contractId: "c1", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" } as const;

describe("useAssistantChat", () => {
  beforeEach(() => {
    vi.mocked(chatWithAssistant).mockReset();
    vi.mocked(updateContractStatus).mockReset();
    navigateMock.mockReset();
  });

  it("인사말로 시작하고 추천 질문을 모두 빠른 답장으로 준다", () => {
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.quickReplies).toEqual(ASSISTANT_SUGGESTIONS);
  });

  it("보낸 말은 인사말을 뺀 대화 기록과 화면 이름으로 서버에 묻고, 실제 답을 붙인다", async () => {
    vi.mocked(chatWithAssistant).mockResolvedValue({ reply: "처리할 일은 2건이에요.", actions: [ASSIGN], needsSetup: false });
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.sendMessage("할 일 알려줘"));
    expect(result.current.isReplying).toBe(true);
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    expect(vi.mocked(chatWithAssistant).mock.calls[0][0]).toEqual({ screen: "대시보드", messages: [{ role: "user", content: "할 일 알려줘" }] });
    expect(result.current.messages[2]).toMatchObject({ role: "assistant", text: "처리할 일은 2건이에요.", actions: [ASSIGN] });
  });

  it("서버 오류면 채팅 안에 실패 안내를 붙인다", async () => {
    vi.mocked(chatWithAssistant).mockRejectedValue(new Error("AI 응답을 받지 못했어요: 429"));
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.sendMessage("할 일 알려줘"));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    expect(result.current.messages[2].text).toContain("429");
  });

  it("배정 확인을 누르면 계약 상태 변경 API 로 배정하고 완료를 알린다", async () => {
    vi.mocked(updateContractStatus).mockResolvedValue({} as never);
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.runAction("a2", 0, ASSIGN));
    await waitFor(() => expect(result.current.actionStates[getActionKey("a2", 0)]).toBe("done"));
    expect(updateContractStatus).toHaveBeenCalledWith("c1", "assigning", "u-kim");
    expect(result.current.messages.at(-1)?.text).toBe("'유지보수 계약' 계약을 김법무에게 배정했어요.");
  });

  it("검토 시작은 법무 검토로 상태를 바꾼다", async () => {
    vi.mocked(updateContractStatus).mockResolvedValue({} as never);
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.runAction("a2", 1, { type: "startReview", contractId: "c2", contractTitle: "공급 계약" }));
    await waitFor(() => expect(updateContractStatus).toHaveBeenCalledWith("c2", "legalReview"));
  });

  it("실행이 실패하면 확인 카드를 다시 누를 수 있게 두고 사유를 알린다", async () => {
    vi.mocked(updateContractStatus).mockRejectedValue(new Error("배정 권한이 없습니다"));
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.runAction("a2", 0, ASSIGN));
    await waitFor(() => expect(result.current.messages.at(-1)?.text).toContain("배정 권한이 없습니다"));
    expect(result.current.actionStates[getActionKey("a2", 0)]).toBeUndefined();
  });

  it("화면 열기는 바로 이동하고, 취소는 카드를 닫는다", () => {
    const { result } = renderHook(() => useAssistantChat("대시보드"), { wrapper });
    act(() => result.current.runAction("a2", 0, { type: "open", label: "결재 대기함", path: "/approvals/inbox" }));
    expect(navigateMock).toHaveBeenCalledWith("/approvals/inbox");
    act(() => result.current.dismissAction("a2", 1));
    expect(result.current.actionStates[getActionKey("a2", 1)]).toBe("dismissed");
  });
});
