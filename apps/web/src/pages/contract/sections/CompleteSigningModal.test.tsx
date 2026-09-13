import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompleteSigningModal } from "./CompleteSigningModal";
import { useFileUpload } from "../hooks/useFileUpload";
import { useCompleteSigning } from "../hooks/useCompleteSigning";
import type { AttachmentState } from "../hooks/useFileUpload";

/**
 * CompleteSigningModal 단위 테스트 — 체결 확정 게이팅(리뷰 I1/B).
 *
 * useFileUpload/useCompleteSigning 을 목킹해 첨부 상태(pending/uploading/error/done)별
 * 게이팅과, 완료(done) 후에는 제거 버튼을 제공하지 않는다(=고아 첨부 방지)는 것을 검증한다.
 * 실제 presign/PUT/confirm 흐름은 useFileUpload.ts 자체의 관심사가 아니라(그 훅은 이미
 * 다른 화면에서 재사용 중) 여기서는 게이팅 로직만 본다.
 */
vi.mock("../hooks/useFileUpload");
vi.mock("../hooks/useCompleteSigning");

const mockedUseFileUpload = vi.mocked(useFileUpload);
const mockedUseCompleteSigning = vi.mocked(useCompleteSigning);

const baseUpload = {
  attachments: [] as AttachmentState[],
  addFiles: vi.fn(),
  removeAttachment: vi.fn(),
  getReadyIds: vi.fn(() => [] as string[]),
  reset: vi.fn(),
  hasPending: false,
};

const submit = vi.fn();
const baseSubmit = { submit, isPending: false, error: null as string | null };

const doneAttachment: AttachmentState = {
  localId: "l1",
  name: "서명본.pdf",
  size: 1024,
  status: "done",
  attachment: {
    id: "file-1",
    name: "서명본.pdf",
    size: 1024,
    mimeType: "application/pdf",
    sha256: "abc123",
    createdAt: "2026-09-13T00:00:00.000Z",
  },
};

const renderModal = (onClose = vi.fn()) => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <CompleteSigningModal contractId="c1" onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
};

describe("CompleteSigningModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload });
    mockedUseCompleteSigning.mockReturnValue({ ...baseSubmit });
  });

  it("서명본이 없으면 체결 확정 버튼이 비활성이다", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "체결 확정" })).toBeDisabled();
  });

  it("업로드 중(pending/uploading)이면 체결 확정 버튼이 비활성이다", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [{ localId: "l1", name: "서명본.pdf", size: 1024, status: "uploading" }],
      hasPending: true,
    });
    renderModal();
    expect(screen.getByRole("button", { name: "체결 확정" })).toBeDisabled();
  });

  it("업로드가 실패(error)해도 체결 확정 버튼이 비활성이다", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [
        { localId: "l1", name: "서명본.pdf", size: 1024, status: "error", reason: "업로드 실패" },
      ],
    });
    renderModal();
    expect(screen.getByRole("button", { name: "체결 확정" })).toBeDisabled();
  });

  it("업로드가 완료(done)되면 체결 확정 버튼이 활성화되고, 클릭 시 그 파일 id 로 submit 한다", async () => {
    const user = userEvent.setup();
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [doneAttachment],
      getReadyIds: vi.fn(() => ["file-1"]),
    });
    renderModal();
    const confirmBtn = screen.getByRole("button", { name: "체결 확정" });
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: "file-1" }),
      expect.anything(),
    );
  });

  it("완료(done)된 첨부는 제거 버튼을 제공하지 않는다(고아 첨부 방지)", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [doneAttachment],
      getReadyIds: vi.fn(() => ["file-1"]),
    });
    renderModal();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("실패한 첨부는 제거할 수 있다(재시도 경로)", async () => {
    const user = userEvent.setup();
    const removeAttachment = vi.fn();
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      removeAttachment,
      attachments: [
        { localId: "l1", name: "서명본.pdf", size: 1024, status: "error", reason: "업로드 실패" },
      ],
    });
    renderModal();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(removeAttachment).toHaveBeenCalledWith("l1");
  });

  it("첨부가 이미 하나 있으면 파일 첨부 드롭존을 더 보여주지 않는다(한 건 제한)", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [doneAttachment],
      getReadyIds: vi.fn(() => ["file-1"]),
    });
    renderModal();
    expect(screen.queryByRole("button", { name: "파일 첨부" })).not.toBeInTheDocument();
  });
});
