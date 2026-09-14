import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoPanel } from "./TodoPanel";
import { TODOS } from "./mock-data";

describe("TodoPanel", () => {
  it("모든 업무의 할 일을 AI 한 줄과 함께 렌더한다", () => {
    render(<TodoPanel onOpen={vi.fn()} />);
    TODOS.forEach((t) => expect(screen.getByText(t.title)).toBeInTheDocument());
    expect(screen.getByText(`${TODOS[0].aiReason} · ${TODOS[0].aiPrepared}`)).toBeInTheDocument();
  });

  it("기한이 가까운 순으로 정렬한다", () => {
    render(<TodoPanel onOpen={vi.fn()} />);
    const titles = TODOS.toSorted((a, b) => a.daysLeft - b.daysLeft).map((t) => t.title);
    const rendered = screen.getAllByText((_, el) => el?.textContent !== undefined && titles.includes(el?.textContent ?? "") && el?.children.length === 0);
    expect(rendered.map((el) => el.textContent)).toEqual(titles);
  });

  it("행을 누르면 onOpen 에 그 할 일을 넘긴다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TodoPanel onOpen={onOpen} />);
    await user.click(screen.getByText(TODOS[0].title));
    expect(onOpen).toHaveBeenCalledWith(TODOS[0]);
  });

  it("액션 버튼을 누르면 onOpen 을 한 번만 호출한다", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TodoPanel onOpen={onOpen} />);
    // 행 클릭과 버튼 클릭이 겹쳐 두 번 열리지 않아야 한다(액션 이름은 할 일마다 다르다)
    await user.click(screen.getByRole("button", { name: TODOS[0].action }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
