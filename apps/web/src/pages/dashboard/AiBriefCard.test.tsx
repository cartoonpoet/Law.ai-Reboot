import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardBriefResponse } from "@lawai/contracts";
import { getDashboardBrief } from "../../api/assistant";
import { updateContractStatus } from "../../api/contracts";
import { AiBriefCard } from "./AiBriefCard";

vi.mock("../../api/assistant");
vi.mock("../../api/contracts");

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

const renderCard = () => render(<AiBriefCard />, { wrapper: Providers });

const BRIEF: DashboardBriefResponse = {
  headline: "오늘 챙길 일은 2건이에요.",
  points: [
    {
      tone: "danger",
      text: "유지보수 계약이 오늘까지인데 아직 미배정이에요.",
      action: { type: "assign", contractId: "c1", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" },
    },
    { tone: "info", text: "결재 대기 1건이 있어요.", action: { type: "open", label: "결재 대기함", path: "/approvals/inbox" } },
  ],
  needsSetup: false,
  generatedAt: "2026-09-15T01:30:00.000Z",
};

describe("AiBriefCard", () => {
  beforeEach(() => {
    vi.mocked(getDashboardBrief).mockReset();
    vi.mocked(updateContractStatus).mockReset();
    navigateMock.mockReset();
  });

  it("불러오는 동안 안내, 오면 AI 가 만든 요약과 항목을 보여준다", async () => {
    vi.mocked(getDashboardBrief).mockResolvedValue(BRIEF);
    renderCard();
    expect(screen.getByLabelText("AI가 오늘 챙길 일을 정리하고 있어요…")).toBeInTheDocument();
    expect(await screen.findByText("오늘 챙길 일은 2건이에요.")).toBeInTheDocument();
    expect(screen.getByText("유지보수 계약이 오늘까지인데 아직 미배정이에요.")).toBeInTheDocument();
    // 옆 작대기 대신 급한 정도를 알약 문구로
    expect(screen.getByText("급해요")).toBeInTheDocument();
    expect(screen.getByText("참고")).toBeInTheDocument();
    expect(getDashboardBrief).toHaveBeenCalledWith(false);
  });

  it("AI 설정이 없으면 설정하러 가기", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardBrief).mockResolvedValue({ ...BRIEF, headline: "AI 브리핑을 보려면 먼저 내 AI 연동(API 키)을 설정해 주세요.", points: [], needsSetup: true });
    renderCard();
    await user.click(await screen.findByRole("button", { name: "AI 설정하러 가기" }));
    expect(navigateMock).toHaveBeenCalledWith("/system");
    expect(screen.queryByRole("button", { name: /다시 정리/ })).not.toBeInTheDocument();
  });

  it("배정은 한 번 더 확인한 뒤 실행하고 완료를 표시한다", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardBrief).mockResolvedValue(BRIEF);
    vi.mocked(updateContractStatus).mockResolvedValue({} as never);
    renderCard();
    await user.click(await screen.findByRole("button", { name: "김법무에게 배정" }));
    expect(updateContractStatus).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("완료했어요")).toBeInTheDocument();
    expect(updateContractStatus).toHaveBeenCalledWith("c1", "assigning", "u-kim");
    expect(screen.getByText("'유지보수 계약' 계약을 김법무에게 배정했어요.")).toBeInTheDocument();
  });

  it("확인에서 취소하면 실행하지 않고 버튼을 치운다", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardBrief).mockResolvedValue(BRIEF);
    renderCard();
    await user.click(await screen.findByRole("button", { name: "김법무에게 배정" }));
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(updateContractStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "김법무에게 배정" })).not.toBeInTheDocument();
  });

  it("화면 열기는 바로 이동한다", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardBrief).mockResolvedValue(BRIEF);
    renderCard();
    await user.click(await screen.findByRole("button", { name: "결재 대기함" }));
    expect(navigateMock).toHaveBeenCalledWith("/approvals/inbox");
  });

  it("다시 정리를 누르면 서버 캐시를 무시하고 새로 받는다", async () => {
    const user = userEvent.setup();
    vi.mocked(getDashboardBrief).mockResolvedValueOnce(BRIEF).mockResolvedValueOnce({ ...BRIEF, headline: "새로 정리했어요." });
    renderCard();
    await user.click(await screen.findByRole("button", { name: /다시 정리/ }));
    expect(await screen.findByText("새로 정리했어요.")).toBeInTheDocument();
    expect(getDashboardBrief).toHaveBeenLastCalledWith(true);
  });

  it("불러오지 못하면 카드 안에서 안내하고 다시 시도할 수 있다", async () => {
    vi.mocked(getDashboardBrief).mockRejectedValue(new Error("AI 브리핑을 받지 못했어요: 429"));
    renderCard();
    expect(await screen.findByText(/AI 브리핑을 불러오지 못했어요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
