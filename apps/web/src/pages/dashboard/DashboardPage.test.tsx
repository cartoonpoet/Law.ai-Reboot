import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./DashboardPage";

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("법무 대시보드 헤더를 렌더한다", () => {
    renderPage();
    expect(screen.getByText("업무 요약")).toBeInTheDocument();
  });

  it("AI 요약 섹션을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("AI 요약")).toBeInTheDocument();
  });

  it("파이프라인 스트립의 스테이지를 렌더한다", () => {
    renderPage();
    // Multiple elements may share these labels; assert at least one exists
    expect(screen.getAllByText("법무 검토").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("배정").length).toBeGreaterThanOrEqual(1);
  });

  it("할일 목록을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("내 할일")).toBeInTheDocument();
  });
});
