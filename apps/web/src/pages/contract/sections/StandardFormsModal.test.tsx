import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { StandardFormsModal } from "./StandardFormsModal";
import * as api from "../../../api/documentTemplates";

const mockItems = [
  {
    id: "t1",
    categoryId: "nda" as const,
    name: "비밀유지계약서(NDA) 표준",
    currentVersionNo: 2,
    createdById: "u1",
    createdByName: "김서연",
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
  },
];
const mockCounts = { nda: 1, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 };

function renderModal(onStart = vi.fn()) {
  vi.spyOn(api, "listTemplates").mockResolvedValue({ items: mockItems, counts: mockCounts });
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <StandardFormsModal onClose={vi.fn()} onStart={onStart} />
    </QueryClientProvider>,
  );
  return { onStart };
}

describe("StandardFormsModal", () => {
  it("타이틀과 양식 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("표준계약서 양식 보기")).toBeInTheDocument();
    // 목록 + 미리보기에 양식명이 중복 표시되므로 findAllByText
    expect((await screen.findAllByText("비밀유지계약서(NDA) 표준")).length).toBeGreaterThan(0);
  });

  it("'이 양식으로 작성 시작' 시 선택 양식을 onStart로 전달한다", async () => {
    const user = userEvent.setup();
    const { onStart } = renderModal();
    await screen.findAllByText("비밀유지계약서(NDA) 표준"); // 로드 후 첫 양식이 기본 선택
    await user.click(screen.getByRole("button", { name: "이 양식으로 작성 시작" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toEqual(expect.objectContaining({ id: "t1", name: expect.stringContaining("비밀유지") }));
  });
});
