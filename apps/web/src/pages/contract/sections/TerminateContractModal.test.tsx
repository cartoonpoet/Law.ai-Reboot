import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminateContractModal } from "./TerminateContractModal";
import { useFileUpload } from "../hooks/useFileUpload";
import { useTerminateContract } from "../hooks/useTerminateContract";
import type { AttachmentState } from "../hooks/useFileUpload";

// 업로드·해지 요청 훅은 목킹하고 확정 게이팅과 요청 본문만 본다(CompleteSigningModal.test 와 같은 방식).
vi.mock("../hooks/useFileUpload");
vi.mock("../hooks/useTerminateContract");

const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseTerminateContract = vi.mocked(useTerminateContract);

const baseUpload = {
  attachments: [] as AttachmentState[],
  addFiles: vi.fn(),
  removeAttachment: vi.fn(),
  getReadyIds: vi.fn(() => [] as string[]),
  reset: vi.fn(),
  hasPending: false,
};

const submit = vi.fn();

const doneAttachment: AttachmentState = {
  localId: "l1",
  name: "해지합의서.pdf",
  size: 2048,
  status: "done",
  attachment: {
    id: "file-term",
    name: "해지합의서.pdf",
    size: 2048,
    mimeType: "application/pdf",
    sha256: "abc",
    createdAt: "2026-09-16T00:00:00.000Z",
  },
};

const renderModal = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TerminateContractModal contractId="c1" onClose={vi.fn()} />
    </QueryClientProvider>,
  );

describe("TerminateContractModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload });
    mockedUseTerminateContract.mockReturnValue({ submit, isPending: false, error: null });
  });

  it("해지 서류와 사유가 없으면 해지 확정 버튼이 비활성이다", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByRole("button", { name: "해지 확정" })).toBeDisabled();

    // 사유만 골라도 서류가 없으면 여전히 비활성.
    await user.click(screen.getByText("합의 해지"));
    expect(screen.getByRole("button", { name: "해지 확정" })).toBeDisabled();
  });

  it("서류가 올라가고 사유를 고르면 해지일·사유·메모·파일로 해지를 요청한다", async () => {
    const user = userEvent.setup();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload, attachments: [doneAttachment] });
    renderModal();

    expect(screen.getByRole("button", { name: "해지 확정" })).toBeDisabled();
    await user.click(screen.getByText("상대방 귀책"));
    await user.type(screen.getByPlaceholderText("해지 경위를 남겨 두세요 (선택)"), "납품 지연 반복");
    await user.click(screen.getByRole("button", { name: "해지 확정" }));

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "counterpartyBreach", note: "납품 지연 반복", fileId: "file-term" }),
      expect.any(Object),
    );
    expect(submit.mock.calls[0][0].terminatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("서버가 거절하면 사유를 창 안에 보여준다", () => {
    mockedUseTerminateContract.mockReturnValue({ submit, isPending: false, error: "해지 권한이 없습니다" });
    renderModal();
    expect(screen.getByText("해지 권한이 없습니다")).toBeInTheDocument();
  });
});
