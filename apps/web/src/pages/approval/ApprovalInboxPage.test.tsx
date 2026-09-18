import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalInboxItem } from "@lawai/contracts";
import { useAiInsights } from "../../components/ai/useAiInsights";
import { ApprovalInboxPage } from "./ApprovalInboxPage";
import { useApprovalInbox } from "./hooks/useApprovalInbox";
import { useInboxDecide } from "./hooks/useInboxDecide";

vi.mock("./hooks/useApprovalInbox");
vi.mock("./hooks/useInboxDecide");
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
  createItem({
    lineId: "old",
    title: "사흘 전 상신한 계약",
    myType: "agree",
    submittedAt: new Date(Date.now() - 3 * DAY_MS).toISOString(),
  }),
];

const decideMock = vi.fn();
const approveManyMock = vi.fn();

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
    vi.clearAllMocks();
    vi.mocked(useAiInsights).mockReturnValue({ "C1:approvalBriefing": { text: "주의 1 — 손해배상 상한", tone: "warning" } });
    vi.mocked(useInboxDecide).mockReturnValue({
      decide: decideMock,
      isDeciding: false,
      approveMany: approveManyMock,
      isApprovingMany: false,
    });
    vi.mocked(useApprovalInbox).mockReturnValue({
      pending: PENDING,
      upcoming: [createItem({ lineId: "up", title: "예정 계약", myStepOrder: 2 })],
      processed: [createItem({ lineId: "done", title: "처리한 계약", myStatus: "approved", myDecidedAt: "2026-09-10T00:00:00.000Z" })],
      isLoading: false,
    });
  });

  it("내 결재 요약과 탭 건수를 보여준다", () => {
    renderPage();
    expect(screen.getByText("3일 넘게 대기").parentElement?.textContent).toContain("1");
    expect(screen.getByRole("button", { name: "내 차례 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "처리한 결재 1" })).toBeInTheDocument();
  });

  it("오래 기다린 결재가 위에 오고 대기 일수와 AI 한 줄을 붙인다", () => {
    renderPage();
    const cards = screen.getAllByRole("checkbox").map((checkbox) => checkbox.closest("div")!.parentElement!);
    expect(within(cards[0]).getByText("사흘 전 상신한 계약")).toBeInTheDocument();
    expect(within(cards[0]).getByText("3일째 대기")).toBeInTheDocument();
    expect(screen.getAllByText("주의 1 — 손해배상 상한").length).toBe(2);
  });

  it("카드에서 바로 승인한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: "합의" })[0]);
    expect(decideMock).toHaveBeenCalledWith({ lineId: "old", decision: "approve" });
  });

  it("반려는 사유를 적어 확인한 뒤에만 처리한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: "반려" })[0]);
    await user.type(screen.getByPlaceholderText(/반려 사유/), "금액 근거 보완");
    expect(decideMock).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "반려" }));
    expect(decideMock).toHaveBeenCalledWith({ lineId: "old", decision: "reject", comment: "금액 근거 보완" });
  });

  it("고른 결재를 한꺼번에 승인한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("checkbox")[0]);
    await user.click(screen.getByRole("button", { name: "선택한 1건 승인" }));
    expect(approveManyMock).toHaveBeenCalledWith(["old"]);
  });

  it("한 페이지에 8건까지 보여주고 나머지는 다음 페이지로 넘긴다", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 10 }, (_, index) =>
      createItem({
        lineId: `L${index}`,
        title: `계약 ${index}`,
        submittedAt: new Date(Date.now() - index * DAY_MS).toISOString(),
      }),
    );
    vi.mocked(useApprovalInbox).mockReturnValue({ pending: many, upcoming: [], processed: [], isLoading: false });

    renderPage();
    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
    expect(screen.getByText("계약 9")).toBeInTheDocument();
    expect(screen.queryByText("계약 0")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByText("계약 0")).toBeInTheDocument();
  });

  it("예정 탭은 처리 버튼 없이 문서 보기만 준다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "예정 1" }));
    expect(screen.getByText("예정 계약")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
  });

  it("처리한 결재 탭은 결과와 처리일을 보여주고 선택할 수 없다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "처리한 결재 1" }));
    expect(screen.getByText(/승인 09-10/)).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("대상 문서가 삭제된 결재는 눌러도 이동하지 않는다", async () => {
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

  it("문서 보기를 누르면 문서 상세로 간다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: "문서 보기" })[0]);
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/C1");
  });
});
