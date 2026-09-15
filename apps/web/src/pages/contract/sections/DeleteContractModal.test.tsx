import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteContractModal } from "./DeleteContractModal";
import { useDeleteContract } from "../hooks/useDeleteContract";

vi.mock("../hooks/useDeleteContract");

const mockedUseDeleteContract = vi.mocked(useDeleteContract);
const remove = vi.fn();

const renderModal = (onClose = vi.fn()) => {
  render(<DeleteContractModal contractId="c1" contractName="표준 NDA" onClose={onClose} />);
  return { onClose };
};

describe("DeleteContractModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDeleteContract.mockReturnValue({ remove, isPending: false, error: null });
  });

  it("계약명과 보존 안내를 보여주고, 삭제를 누르면 삭제를 요청한다", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByText("표준 NDA")).toBeInTheDocument();
    expect(screen.getByText(/첨부 파일과 변경 기록은 보존됩니다/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("취소를 누르면 닫힌다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("삭제 중이면 버튼이 비활성이다", () => {
    mockedUseDeleteContract.mockReturnValue({ remove, isPending: true, error: null });
    renderModal();
    expect(screen.getByRole("button", { name: "삭제 중…" })).toBeDisabled();
  });

  it("서버 거절 사유를 보여준다", () => {
    mockedUseDeleteContract.mockReturnValue({
      remove,
      isPending: false,
      error: "체결 결재가 진행 중인 계약은 삭제할 수 없습니다. 결재를 끝내거나 반려한 뒤 삭제하세요",
    });
    renderModal();
    expect(screen.getByText(/체결 결재가 진행 중인 계약은 삭제할 수 없습니다/)).toBeInTheDocument();
  });
});
