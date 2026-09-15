import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReplaceSignedFileModal } from "./ReplaceSignedFileModal";
import { useFileUpload } from "../hooks/useFileUpload";
import { useReplaceSignedFile } from "../hooks/useReplaceSignedFile";
import type { AttachmentState } from "../hooks/useFileUpload";

// 업로드·교체 훅을 목킹해 교체 버튼 게이팅(새 파일 업로드 완료 + 사유 입력)만 본다.
vi.mock("../hooks/useFileUpload");
vi.mock("../hooks/useReplaceSignedFile");

const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseReplaceSignedFile = vi.mocked(useReplaceSignedFile);

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
  name: "서명본_재업로드.pdf",
  size: 2048,
  status: "done",
  attachment: {
    id: "file-new",
    name: "서명본_재업로드.pdf",
    size: 2048,
    mimeType: "application/pdf",
    sha256: "abc",
    createdAt: "2026-09-15T00:00:00.000Z",
  },
};

const renderModal = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReplaceSignedFileModal contractId="c1" onClose={vi.fn()} />
    </QueryClientProvider>,
  );

describe("ReplaceSignedFileModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload });
    mockedUseReplaceSignedFile.mockReturnValue({ submit, isPending: false, error: null });
  });

  it("새 서명본이 없으면 교체 버튼이 비활성이다", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "서명본 교체" })).toBeDisabled();
  });

  it("업로드가 끝나도 사유가 비어 있으면 비활성이다", () => {
    mockedUseFileUpload.mockReturnValue({ ...baseUpload, attachments: [doneAttachment] });
    renderModal();
    expect(screen.getByRole("button", { name: "서명본 교체" })).toBeDisabled();
  });

  it("업로드 완료 + 사유 입력이면 그 파일과 사유로 교체를 요청한다", async () => {
    const user = userEvent.setup();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload, attachments: [doneAttachment] });
    renderModal();

    await user.type(screen.getByPlaceholderText(/날인이 빠진 파일/), "  날인 누락본  ");
    const button = screen.getByRole("button", { name: "서명본 교체" });
    expect(button).not.toBeDisabled();
    await user.click(button);

    expect(submit).toHaveBeenCalledWith(
      { fileId: "file-new", reason: "날인 누락본" },
      expect.anything(),
    );
  });

  it("서버 거절 사유를 보여준다", () => {
    mockedUseReplaceSignedFile.mockReturnValue({ submit, isPending: false, error: "서명본 교체 권한이 없습니다" });
    renderModal();
    expect(screen.getByText("서명본 교체 권한이 없습니다")).toBeInTheDocument();
  });
});
