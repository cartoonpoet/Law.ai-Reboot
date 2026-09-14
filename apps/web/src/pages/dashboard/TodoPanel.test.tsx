import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoPanel } from "./TodoPanel";
import type { TodoItem } from "./dashboardTypes";

const TODOS: TodoItem[] = [
  {
    key: "contract-c1",
    type: "계약",
    code: "C-1",
    title: "유지보수 계약서",
    status: "미배정",
    action: "담당자 배정",
    daysLeft: 0,
    path: "/contract/c1",
    aiTarget: { contractId: "c1", kind: "precheck" },
  },
  {
    key: "approval-l1",
    type: "결재",
    code: null,
    title: "NDA 체결 품의",
    status: "1/2단계 · 김요청",
    action: "결재하기",
    daysLeft: null,
    path: "/approvals/inbox",
    aiTarget: null,
  },
];

const renderPanel = (overrides: Partial<Parameters<typeof TodoPanel>[0]> = {}) =>
  render(<TodoPanel todos={TODOS} insights={{}} isLoading={false} onOpen={vi.fn()} {...overrides} />);

describe("TodoPanel", () => {
  it("할 일과 D-day 를 그리고, 기한이 없으면 — 로 표시한다", () => {
    renderPanel();
    expect(screen.getByText("유지보수 계약서")).toBeInTheDocument();
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("AI 분석 요약이 있는 할 일에만 AI 한 줄을 붙인다", () => {
    renderPanel({ insights: { "c1:precheck": { text: "주의 1 — 지체상금", tone: "warning" } } });
    expect(screen.getByText("주의 1 — 지체상금")).toBeInTheDocument();
    expect(screen.getAllByText("AI")).toHaveLength(1);
  });

  it("업무 종류가 둘 이상일 때만 필터 칩을 보여준다", () => {
    const { rerender } = renderPanel();
    expect(screen.getByText("전체")).toBeInTheDocument();
    rerender(<TodoPanel todos={[TODOS[0]]} insights={{}} isLoading={false} onOpen={vi.fn()} />);
    expect(screen.queryByText("전체")).not.toBeInTheDocument();
  });

  it("행을 누르면 onOpen 에 그 할 일을 넘긴다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderPanel({ onOpen });
    await user.click(screen.getByText("NDA 체결 품의"));
    expect(onOpen).toHaveBeenCalledWith(TODOS[1]);
  });

  it("액션 버튼을 누르면 onOpen 을 한 번만 호출한다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderPanel({ onOpen });
    await user.click(screen.getByRole("button", { name: "담당자 배정" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
