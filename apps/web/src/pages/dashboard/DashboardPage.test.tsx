import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { buildPipeline } from "./buildPipeline";
import { useDashboard } from "./hooks/useDashboard";
import type { DeadlineItem, TodoItem } from "./dashboardTypes";

vi.mock("./hooks/useDashboard");

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const TODO: TodoItem = {
  key: "contract-c1",
  type: "계약",
  code: "C20260914-0001",
  title: "유지보수 계약서",
  status: "법무 검토 중",
  action: "법무 검토",
  daysLeft: 2,
  path: "/contract/c1",
};

const DEADLINE: DeadlineItem = {
  id: "c2",
  code: "C20260914-0002",
  title: "공급계약",
  dueDate: "2026-09-16T00:00:00.000Z",
  daysLeft: 2,
  status: "요청자 검토 중",
  path: "/contract/c2",
};

const mockDashboard = (overrides: Partial<ReturnType<typeof useDashboard>> = {}) =>
  vi.mocked(useDashboard).mockReturnValue({
    todos: [TODO],
    isTodosLoading: false,
    stages: buildPipeline({ unassigned: 3, legalReview: 5 }),
    isPipelineLoading: false,
    deadlines: [DEADLINE],
    isDeadlinesLoading: false,
    ...overrides,
  });

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

describe("DashboardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    mockDashboard();
  });

  it("실제 데이터로 파이프라인·할 일·기한을 그린다", () => {
    renderPage();
    expect(screen.getByText("업무 요약")).toBeInTheDocument();
    expect(screen.getByText("진행 중 8건")).toBeInTheDocument();
    expect(screen.getByText("가장 많음")).toBeInTheDocument();
    expect(screen.getByText(TODO.title)).toBeInTheDocument();
    expect(screen.getByText(DEADLINE.title)).toBeInTheDocument();
  });

  it("가짜 공지·AI 요약과 검토 요청 버튼은 없다", () => {
    renderPage();
    expect(screen.queryByText("공지 · 새소식")).not.toBeInTheDocument();
    expect(screen.queryByText("AI 요약")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /검토 요청/ })).not.toBeInTheDocument();
  });

  it("할 일과 기한을 누르면 해당 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText(TODO.title));
    expect(navigateMock).toHaveBeenCalledWith("/contract/c1");
    await user.click(screen.getByText(DEADLINE.title));
    expect(navigateMock).toHaveBeenCalledWith("/contract/c2");
  });

  it("할 일·기한이 없으면 빈 안내를 보여준다", () => {
    mockDashboard({ todos: [], deadlines: [] });
    renderPage();
    expect(screen.getByText("지금 처리할 일이 없어요")).toBeInTheDocument();
    expect(screen.getByText("2주 안에 기한이 오는 계약이 없어요")).toBeInTheDocument();
  });

  it("불러오는 중에는 로딩 안내를 보여준다", () => {
    mockDashboard({ todos: [], deadlines: [], isTodosLoading: true, isDeadlinesLoading: true, isPipelineLoading: true });
    renderPage();
    expect(screen.getByText("할 일을 불러오는 중이에요")).toBeInTheDocument();
    expect(screen.getByText("불러오는 중")).toBeInTheDocument();
  });
});
