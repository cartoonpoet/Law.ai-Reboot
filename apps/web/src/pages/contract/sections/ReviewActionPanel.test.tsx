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

// TerminateContractModal 자체(업로드·해지 요청)는 TerminateContractModal.test.tsx 가 커버한다.
vi.mock("./TerminateContractModal", () => ({
  TerminateContractModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="중도 해지 모달 스텁">
      <button onClick={onClose}>해지 모달 닫기</button>
    </div>
  ),
}));

const CAN: ContractCan = { edit: false, assign: false, transition: true, delete: false, replaceSignedFile: false };

const baseProps = {
  contractId: "c1",
  status: "signing" as ContractStatus,
  can: CAN,
  ownerName: "김법무",
  approvalLine: [],
  signedAt: null,
  closure: null,
  isUpdating: false,
  onReject: vi.fn(),
  onReviewDone: vi.fn(),
  onStartReview: vi.fn(),
  onAssign: vi.fn(),
  onProgress: vi.fn(),
  approval: { isRequester: false, isMyTurn: false, canSubmit: false, isApprovalComplete: true },
  precheckItems: [],
  onSubmitApproval: vi.fn(),
  isSubmitting: false,
  onApproveStep: vi.fn(),
  onOpenRejectModal: vi.fn(),
  isDeciding: false,
};

describe("ReviewActionPanel — 검토 시작", () => {
  it("배정 중 계약의 담당자가 '검토 시작'을 누르면 onStartReview 를 호출한다", async () => {
    const user = userEvent.setup();
    const onStartReview = vi.fn();
    render(
      <ReviewActionPanel
        {...baseProps}
        status="assigning"
        can={{ edit: true, assign: false, transition: true, delete: false, replaceSignedFile: false }}
        onStartReview={onStartReview}
      />,
    );
    await user.click(screen.getByRole("button", { name: "검토 시작" }));
    expect(onStartReview).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewActionPanel — 체결 이후 진행", () => {
  it("'이행 시작'을 누르면 확인 창이 뜨고, 확인해야 onProgress('fulfilling') 를 호출한다", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    render(<ReviewActionPanel {...baseProps} status="signed" onProgress={onProgress} />);

    await user.click(screen.getByRole("button", { name: "이행 시작" }));
    expect(onProgress).not.toHaveBeenCalled();
    expect(screen.getByText(/체결 완료 단계로는 되돌릴 수 없어요/)).toBeInTheDocument();

    const dialogButtons = screen.getAllByRole("button", { name: "이행 시작" });
    await user.click(dialogButtons[dialogButtons.length - 1]);
    expect(onProgress).toHaveBeenCalledWith("fulfilling");
  });

  it("'계약 종료' 확인 창에서 취소하면 아무것도 바꾸지 않는다", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    render(<ReviewActionPanel {...baseProps} status="fulfilling" onProgress={onProgress} />);

    await user.click(screen.getByRole("button", { name: "계약 종료" }));
    expect(screen.getByText(/종료한 계약은 다시 진행할 수 없어요/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(onProgress).not.toHaveBeenCalled();
    expect(screen.queryByText(/종료한 계약은 다시 진행할 수 없어요/)).not.toBeInTheDocument();
  });
});

describe("ReviewActionPanel — 중도 해지·종료 정보", () => {
  it("계약 이행 중이면 '중도 해지'를 누를 때 해지 창이 열린다", async () => {
    const user = userEvent.setup();
    render(<ReviewActionPanel {...baseProps} status="fulfilling" />);
    expect(screen.queryByRole("dialog", { name: "중도 해지 모달 스텁" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "중도 해지" }));
    expect(screen.getByRole("dialog", { name: "중도 해지 모달 스텁" })).toBeInTheDocument();
  });

  it("종료된 계약은 종료 사유·종료일·메모를 보여준다", () => {
    render(
      <ReviewActionPanel
        {...baseProps}
        status="closed"
        closure={{ reason: "중도 해지", closedAt: "2026-09-30", note: "합의 해지 — 상대방 사업 철수" }}
      />,
    );
    expect(screen.getByText("종료 사유")).toBeInTheDocument();
    expect(screen.getByText("중도 해지")).toBeInTheDocument();
    expect(screen.getByText("2026-09-30")).toBeInTheDocument();
    expect(screen.getByText("합의 해지 — 상대방 사업 철수")).toBeInTheDocument();
  });
});

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
