import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ReviewActionPanel } from "./ReviewActionPanel";
import type { ContractStatus, ContractCan } from "@lawai/contracts";

// CompleteSigningModal 자체(업로드/체결 hook)는 CompleteSigningModal.test.tsx 가 이미
// 커버한다 — 여기서는 ReviewActionPanel 이 로컬 상태로 모달 열림을 올바르게 토글하는지만 본다.
vi.mock("./CompleteSigningModal", () => ({
  CompleteSigningModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="체결 처리 모달 스텁">
      <button onClick={onClose}>모달 닫기</button>
    </div>
  ),
}));

const CAN: ContractCan = { edit: false, assign: false, transition: true, delete: false };

const baseProps = {
  contractId: "c1",
  status: "signing" as ContractStatus,
  can: CAN,
  ownerName: "김법무",
  approvalLine: [],
  signedAt: null,
  isUpdating: false,
  onReject: vi.fn(),
  onReviewDone: vi.fn(),
  onAssign: vi.fn(),
  approval: { isRequester: false, isMyTurn: false, canSubmit: false, isApprovalComplete: true },
  precheckItems: [],
  onSubmitApproval: vi.fn(),
  isSubmitting: false,
  onApproveStep: vi.fn(),
  onOpenRejectModal: vi.fn(),
  isDeciding: false,
};

describe("ReviewActionPanel — 체결 처리 모달", () => {
  it("초기에는 모달이 닫혀 있다가, '체결 처리' 버튼 클릭 시 열린다", async () => {
    const user = userEvent.setup();
    render(<ReviewActionPanel {...baseProps} />);
    expect(screen.queryByRole("dialog", { name: "체결 처리 모달 스텁" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "체결 처리" }));
    expect(screen.getByRole("dialog", { name: "체결 처리 모달 스텁" })).toBeInTheDocument();
  });

  it("모달의 onClose 가 호출되면 다시 닫힌다", async () => {
    const user = userEvent.setup();
    render(<ReviewActionPanel {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "체결 처리" }));
    await user.click(screen.getByRole("button", { name: "모달 닫기" }));
    expect(screen.queryByRole("dialog", { name: "체결 처리 모달 스텁" })).not.toBeInTheDocument();
  });

  it("결재가 완료되지 않으면 체결 처리 버튼 자체가 없다", () => {
    render(
      <ReviewActionPanel
        {...baseProps}
        approval={{ ...baseProps.approval, isApprovalComplete: false }}
      />,
    );
    expect(screen.queryByRole("button", { name: "체결 처리" })).not.toBeInTheDocument();
  });
});
