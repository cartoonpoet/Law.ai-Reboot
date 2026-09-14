import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { TODOS } from "./mock-data";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

describe("DashboardPage", () => {
  beforeEach(() => navigateMock.mockReset());

  it("헤더·AI 요약·파이프라인·할 일·일정을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("업무 요약")).toBeInTheDocument();
    expect(screen.getByText("AI 요약")).toBeInTheDocument();
    expect(screen.getByText("계약 검토 파이프라인")).toBeInTheDocument();
    expect(screen.getByText("내 할일")).toBeInTheDocument();
    expect(screen.getByText("일정 · 기한 임박")).toBeInTheDocument();
  });

  it("사이드바와 겹치는 검토 요청 버튼은 없다", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /검토 요청/ })).not.toBeInTheDocument();
  });

  it("파이프라인 업무 종류 탭을 바꾸면 그 업무의 단계가 보인다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /송무/ }));
    expect(screen.getByText("송무 파이프라인")).toBeInTheDocument();
    expect(screen.getByText("기일 임박")).toBeInTheDocument();
  });

  it("계약 할 일을 누르면 계약 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderPage();
    const contractTodo = TODOS.find((t) => t.type === "계약");
    await user.click(screen.getByText(contractTodo!.title));
    expect(navigateMock).toHaveBeenCalledWith(`/contract/${contractTodo!.id}`);
  });
});
