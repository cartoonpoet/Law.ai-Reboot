import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { Sidebar } from "./Sidebar";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSidebar(initial = "/") {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Sidebar />
      <Routes>
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("주요 메뉴 라벨을 렌더한다", () => {
    renderSidebar();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("계약")).toBeInTheDocument();
    expect(screen.getByText("시스템 관리")).toBeInTheDocument();
  });

  it("초기엔 하위 메뉴가 접혀 있다", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "계약" })).toHaveAttribute("aria-expanded", "false");
  });

  it("부모 메뉴 클릭 시 하위 메뉴를 펼친다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "계약" }));
    expect(screen.getByRole("button", { name: "계약" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
  });

  it("리프 메뉴 클릭 시 해당 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /법률자문/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/advice");
  });

  it("하위 메뉴 클릭 시 그 경로로 이동한다", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "계약" }));
    await user.click(screen.getByText("계약서 검토 조회"));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/list");
  });

  it("로그아웃 클릭 시 localStorage를 비우고 /login으로 이동한다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("accessToken", "tok");
    renderSidebar("/advice");
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
