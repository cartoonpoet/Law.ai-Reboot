import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { ApprovalLineModal } from "./ApprovalLineModal";
import type { Approver } from "../request-schema";

const INITIAL: Approver[] = [{ name: "손준호", dept: "법무팀", type: "draft" }];

function renderModal(onApply = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ApprovalLineModal initial={INITIAL} onClose={vi.fn()} onApply={onApply} />
    </QueryClientProvider>,
  );
  return { onApply };
}

describe("ApprovalLineModal", () => {
  it("타이틀과 인물 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("결재선 설정")).toBeInTheDocument();
    // 좌측 인물 목록(useQuery)
    expect(await screen.findByText("이법무")).toBeInTheDocument();
  });

  it("인물 추가 후 '적용' 시 결재선을 onApply로 전달한다", async () => {
    const user = userEvent.setup();
    const { onApply } = renderModal();
    await user.click(await screen.findByText("이법무")); // 결재자 추가(기본 유형 결재)
    await user.click(screen.getByRole("button", { name: "적용" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0][0];
    expect(applied).toHaveLength(2); // 기안 + 이법무
    expect(applied[1]).toEqual({ name: "이법무", dept: "법무팀", type: "approve" });
  });
});
