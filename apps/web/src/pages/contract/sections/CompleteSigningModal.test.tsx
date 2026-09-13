import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompleteSigningModal } from "./CompleteSigningModal";
import { useFileUpload } from "../hooks/useFileUpload";
import { useCompleteSigning } from "../hooks/useCompleteSigning";
import type { AttachmentState } from "../hooks/useFileUpload";

/**
 * CompleteSigningModal 단위 테스트 — 체결 확정 게이팅(리뷰 I1 fix round 2 / B).
 *
 * useFileUpload/useCompleteSigning 을 목킹해 첨부 상태(pending/uploading/error/done)별
 * 게이팅을 검증한다. 제거 버튼은 error 상태에서만 제공한다 — confirm 이 uploading 중에
 * 이미 성공(File 행 생성)할 수 있어 pending/uploading 상태에서 제거를 허용하면 고아
 * 첨부가 생길 수 있기 때문이다(컴포넌트 상단 주석 참고). 실제 presign/PUT/confirm 흐름은
 * useFileUpload.ts 자체의 관심사라(다른 화면과 공유) 여기서는 게이팅 로직만 본다.
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

  it("pending 상태에서는 제거 버튼을 제공하지 않는다(confirm 이 이미 성공했을 수 있음)", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [{ localId: "l1", name: "서명본.pdf", size: 1024, status: "pending" }],
    });
    renderModal();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("uploading 상태에서는 제거 버튼을 제공하지 않는다(confirm 이 이미 성공했을 수 있음)", () => {
    mockedUseFileUpload.mockReturnValue({
      ...baseUpload,
      attachments: [{ localId: "l1", name: "서명본.pdf", size: 1024, status: "uploading" }],
      hasPending: true,
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

  it("여러 파일을 한 번에 올리면 첫 번째만 사용하고, 잘렸다는 안내를 보여준다", async () => {
    const user = userEvent.setup();
    const addFiles = vi.fn();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload, addFiles });
    renderModal();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fileA = new File(["a"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["b"], "b.pdf", { type: "application/pdf" });
    await user.upload(input, [fileA, fileB]);

    expect(
      await screen.findByText("서명본은 한 건만 첨부할 수 있어 첫 번째 파일만 사용했습니다."),
    ).toBeInTheDocument();
    expect(addFiles).toHaveBeenCalledWith([fileA]);
  });

  it("파일 한 건만 올리면 잘림 안내를 보여주지 않는다", async () => {
    const user = userEvent.setup();
    const addFiles = vi.fn();
    mockedUseFileUpload.mockReturnValue({ ...baseUpload, addFiles });
    renderModal();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["a"], "a.pdf", { type: "application/pdf" }));

    expect(
      screen.queryByText("서명본은 한 건만 첨부할 수 있어 첫 번째 파일만 사용했습니다."),
    ).not.toBeInTheDocument();
  });
});
