import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
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
  isTargetDeleted: false,
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

const LocationProbe = () => <span data-testid="location">{useLocation().pathname}</span>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/approvals/inbox"]}>
      <ApprovalInboxPage />
      <LocationProbe />
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

  it("설명 문구·통계 카드 없이 탭에 건수를 붙인다", () => {
    renderPage();
    expect(screen.queryByText(/처리만/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 차례 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예정 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "처리한 결재 1" })).toBeInTheDocument();
  });

  it("오래 기다린 결재가 위, 첫 행에 경과 D+n 과 역할, 관리번호 줄", () => {
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

  it("행을 누르면 문서 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("이틀 전 상신한 계약"));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/C1");
  });

  it("예정 탭에는 내 차례를 기다리는 결재가 나온다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "예정 1" }));
    expect(screen.getByText("예정 계약")).toBeInTheDocument();
  });

  it("대상 계약이 삭제된 결재는 삭제됨으로 보이고 눌러도 이동하지 않는다", async () => {
    const user = userEvent.setup();
    vi.mocked(useApprovalInbox).mockReturnValue({
      pending: [createItem({ lineId: "gone", title: "삭제된 계약 품의", isTargetDeleted: true })],
      upcoming: [],
      processed: [],
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText("C20260908-0142 · 계약 · 삭제됨")).toBeInTheDocument();
    await user.click(screen.getByText("삭제된 계약 품의"));
    expect(screen.getByTestId("location")).toHaveTextContent("/approvals/inbox");
  });

  it("처리한 결재 탭은 처리 결과와 처리일을 보여준다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "처리한 결재 1" }));
    expect(screen.getByText("처리 결과")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("09-10")).toBeInTheDocument();
  });
});
