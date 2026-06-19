import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoPanel } from "./TodoPanel";
import { TODOS, CONTRACTS } from "./mock-data";

describe("TodoPanel", () => {
  it("기본 '내 할일' 탭에 할일 목록을 렌더한다", () => {
    render(<TodoPanel />);
    expect(screen.getByText(TODOS[0].title)).toBeInTheDocument();
  });

  it("할일 행 클릭 시 onOpen을 호출한다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TodoPanel onOpen={onOpen} />);
    await user.click(screen.getByText(TODOS[0].title));
    expect(onOpen).toHaveBeenCalledWith(TODOS[0].id);
  });

  it("'진행 중 계약' 탭으로 전환하면 계약 테이블(컬럼·행)을 렌더한다", async () => {
    const user = userEvent.setup();
    render(<TodoPanel />);
    await user.click(screen.getByRole("tab", { name: /진행 중 계약/ }));
    expect(screen.getByText("관리번호")).toBeInTheDocument();
    expect(screen.getByText("상대계약자")).toBeInTheDocument();
    expect(screen.getByText("담당자")).toBeInTheDocument();
    expect(screen.getByText(CONTRACTS[0].name)).toBeInTheDocument();
    // 미배정 담당자 강조 셀
    expect(screen.getAllByText("미배정").length).toBeGreaterThan(0);
  });

  it("계약 행 클릭 시 onOpen을 호출한다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TodoPanel onOpen={onOpen} />);
    await user.click(screen.getByRole("tab", { name: /진행 중 계약/ }));
    await user.click(screen.getByText(CONTRACTS[0].name));
    expect(onOpen).toHaveBeenCalledWith(CONTRACTS[0].id);
  });
});
