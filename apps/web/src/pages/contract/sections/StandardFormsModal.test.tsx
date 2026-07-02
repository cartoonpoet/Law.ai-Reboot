import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { StandardFormsModal } from "./StandardFormsModal";

function renderModal(onAttach = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <StandardFormsModal onClose={vi.fn()} onAttach={onAttach} />
    </QueryClientProvider>,
  );
  return { onAttach };
}

describe("StandardFormsModal", () => {
  it("타이틀과 양식 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("표준계약서 양식 보기")).toBeInTheDocument();
    // 목록 + 미리보기에 양식명이 중복 표시되므로 findAllByText
    expect((await screen.findAllByText("비밀유지계약서(NDA) 표준")).length).toBeGreaterThan(0);
  });

  it("'이 양식으로 첨부' 시 선택 양식을 onAttach로 전달한다", async () => {
    const user = userEvent.setup();
    const { onAttach } = renderModal();
    await screen.findAllByText("비밀유지계약서(NDA) 표준"); // 로드 후 첫 양식이 기본 선택
    await user.click(screen.getByRole("button", { name: "이 양식으로 첨부" }));
    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onAttach.mock.calls[0][0]).toEqual(expect.objectContaining({ name: expect.stringContaining("비밀유지") }));
  });
});
