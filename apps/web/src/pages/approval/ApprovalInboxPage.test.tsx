import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalInboxItem } from "@lawai/contracts";
import { useAiInsights } from "../../components/ai/useAiInsights";
import { ApprovalInboxPage } from "./ApprovalInboxPage";
import { useApprovalInbox } from "./hooks/useApprovalInbox";

vi.mock("./hooks/useApprovalInbox");
vi.mock("../../components/ai/useAiInsights", async (orig) => {
  const actual = await orig<typeof import("../../components/ai/useAiInsights")>();
  return { ...actual, useAiInsights: vi.fn() };
});

const DAY_MS = 86_400_000;

const createItem = (overrides: Partial<ApprovalInboxItem>): ApprovalInboxItem => ({
  lineId: "L1",
  targetType: "contract",
  targetId: "C1",
  targetCode: "C20260908-0142",
  title: "클라우드 서비스 이용계약",
  submittedById: "u1",
  submittedByName: "한지원",
  submittedByDept: "사업개발팀",
  myStepOrder: 1,
  totalSteps: 4,
  myType: "approve",
  submittedAt: new Date().toISOString(),
  lineStatus: "pending",
  myStatus: "pending",
  myDecidedAt: null,
  ...overrides,
});

const PENDING = [
  createItem({ lineId: "today", title: "오늘 상신한 계약", submittedAt: new Date().toISOString() }),
  createItem({ lineId: "old", title: "이틀 전 상신한 계약", myType: "agree", submittedAt: new Date(Date.now() - 2 * DAY_MS).toISOString() }),
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <ApprovalInboxPage />
    </MemoryRouter>,
  );

describe("ApprovalInboxPage", () => {
  beforeEach(() => {
    vi.mocked(useAiInsights).mockReturnValue({ "C1:approvalBriefing": { text: "주의 1 — 손해배상 상한", tone: "warning" } });
    vi.mocked(useApprovalInbox).mockReturnValue({
      pending: PENDING,
      upcoming: [createItem({ lineId: "up", title: "예정 계약", myStepOrder: 2 })],
      processed: [createItem({ lineId: "done", title: "처리한 계약", myStatus: "approved", myDecidedAt: "2026-09-10T00:00:00.000Z" })],
      isLoading: false,
    });
  });

  it("설명 문구와 통계 카드(내 차례·예정·최근 30일 처리)를 보여준다", () => {
    renderPage();
    expect(screen.getByText(/처리만/)).toBeInTheDocument();
    const stat = (label: string) => screen.getAllByText(label).find((el) => el.parentElement?.textContent?.endsWith("건"))!.parentElement!;
    expect(stat("내 차례").textContent).toBe("내 차례2건");
    expect(stat("내 차례 예정").textContent).toBe("내 차례 예정1건");
    expect(stat("최근 30일 처리").textContent).toBe("최근 30일 처리1건");
  });

  it("오래 기다린 결재가 위, 첫 행에 경과 D+n 과 역할 배지, 관리번호 줄", () => {
    renderPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("이틀 전 상신한 계약")).toBeInTheDocument();
    expect(within(rows[0]).getByText("D+2")).toBeInTheDocument();
    expect(within(rows[0]).getByText("합의")).toBeInTheDocument();
    expect(within(rows[0]).getByText("체결 품의")).toBeInTheDocument();
    expect(within(rows[0]).getByText("C20260908-0142 · 계약")).toBeInTheDocument();
    expect(within(rows[1]).getByText("오늘")).toBeInTheDocument();
  });

  it("처리할 결재에 AI 브리핑 한 줄을 붙인다", () => {
    renderPage();
    expect(screen.getAllByText("주의 1 — 손해배상 상한").length).toBeGreaterThan(0);
  });

  it("예정 탭에는 내 차례를 기다리는 결재가 보기 버튼과 함께 나온다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "예정" }));
    expect(screen.getByText("예정 계약")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "처리" })).not.toBeInTheDocument();
  });

  it("처리한 결재 탭은 처리 결과와 처리일을 보여준다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "처리한 결재" }));
    expect(screen.getByText("처리 결과")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("09-10")).toBeInTheDocument();
  });
});
