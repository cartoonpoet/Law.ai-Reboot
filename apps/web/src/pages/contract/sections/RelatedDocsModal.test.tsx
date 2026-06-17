import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { RelatedDocsModal } from "./RelatedDocsModal";

function renderModal(onConfirm = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RelatedDocsModal selected={[]} onClose={vi.fn()} onConfirm={onConfirm} />
    </QueryClientProvider>,
  );
  return { onConfirm };
}

describe("RelatedDocsModal", () => {
  it("타이틀과 문서 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("관련문서 찾아보기")).toBeInTheDocument();
    expect(await screen.findByText("SW공급계약서_v2")).toBeInTheDocument();
  });

  it("문서를 선택하고 '선택 완료'하면 onConfirm으로 전달한다", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    await user.click(await screen.findByText("SW공급계약서_v2"));
    await user.click(screen.getByRole("button", { name: "선택 완료" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toEqual([
      expect.objectContaining({ name: "SW공급계약서_v2", category: "contract" }),
    ]);
  });
});
