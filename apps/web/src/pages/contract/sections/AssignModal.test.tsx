import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { AssignModal } from "./AssignModal";

// useUserSearch 가 호출하는 디렉터리 검색을 목킹(검색→목록 렌더).
vi.mock("../../../api/directory", () => ({
  searchUsers: vi.fn().mockResolvedValue([
    { id: "lee", name: "이법무 (법무팀)" },
    { id: "kim", name: "김검토 (법무팀)" },
  ]),
}));

function renderModal(onAssign = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AssignModal onClose={vi.fn()} onAssign={onAssign} />
    </QueryClientProvider>,
  );
  return { onAssign };
}

describe("AssignModal", () => {
  it("타이틀과 검색된 담당자 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("검토 담당자 배정")).toBeInTheDocument();
    expect(await screen.findByText("이법무 (법무팀)")).toBeInTheDocument();
    expect(screen.getByText("김검토 (법무팀)")).toBeInTheDocument();
  });

  it("담당자 선택 후 '배정' 클릭 시 onAssign(ownerId)을 호출한다", async () => {
    const user = userEvent.setup();
    const { onAssign } = renderModal();
    await user.click(await screen.findByText("이법무 (법무팀)"));
    await user.click(screen.getByRole("button", { name: "배정" }));
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledWith("lee");
  });

  it("아무도 선택하지 않으면 배정 버튼이 비활성이라 onAssign이 호출되지 않는다", async () => {
    const user = userEvent.setup();
    const { onAssign } = renderModal();
    await screen.findByText("이법무 (법무팀)");
    const assignBtn = screen.getByRole("button", { name: "배정" });
    expect(assignBtn).toBeDisabled();
    await user.click(assignBtn);
    expect(onAssign).not.toHaveBeenCalled();
  });
});
