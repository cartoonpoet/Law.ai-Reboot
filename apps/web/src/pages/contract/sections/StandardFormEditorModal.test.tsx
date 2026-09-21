import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { StandardFormEditorModal } from "./StandardFormEditorModal";
import * as templatesApi from "../../../api/documentTemplates";
import * as documentsApi from "../../../api/documents";

const renderModal = (onComplete: (file: File) => Promise<void>, onClose = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={client}>
        <StandardFormEditorModal templateId="t1" templateName="비밀유지계약서 표준" onClose={onClose} onComplete={onComplete} />
      </QueryClientProvider>,
    ),
  };
};

describe("StandardFormEditorModal — 업로드/내보내기 중 닫기 방지", () => {
  beforeEach(() => {
    vi.spyOn(templatesApi, "getTemplate").mockResolvedValue({
      id: "t1",
      categoryId: "nda",
      name: "비밀유지계약서 표준",
      currentVersionNo: 1,
      createdById: "u1",
      createdByName: "김서연",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      currentVersion: { versionNo: 1, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: "u1", createdByName: "김서연", createdAt: "2026-09-20T00:00:00.000Z" },
    });
    vi.spyOn(documentsApi, "exportDocument").mockResolvedValue({
      base64: "ZHVtbXk=",
      fileName: "비밀유지계약서 표준.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("onComplete가 끝나기 전에는 취소 버튼이 비활성화되고, ESC·배경 클릭으로도 닫히지 않는다", async () => {
    let resolveComplete!: () => void;
    const onComplete = vi.fn(() => new Promise<void>((resolve) => (resolveComplete = resolve)));
    const { onClose } = renderModal(onComplete);

    await screen.findByLabelText("계약서 작성");
    await userEvent.click(screen.getByText("이 내용으로 계약서 첨부"));

    // 업로드(onComplete)가 아직 안 끝난 상태 — 취소 버튼은 비활성화, ESC도 닫지 않는다.
    await waitFor(() => expect(screen.getByText("취소")).toBeDisabled());
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("취소"));
    expect(onClose).not.toHaveBeenCalled();

    resolveComplete();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("onComplete가 끝나기 전이면 취소 버튼을 눌러도 아무 일도 일어나지 않는다(경합 방지)", async () => {
    let resolveComplete!: () => void;
    const onComplete = vi.fn(() => new Promise<void>((resolve) => (resolveComplete = resolve)));
    renderModal(onComplete);

    await screen.findByLabelText("계약서 작성");
    await userEvent.click(screen.getByText("이 내용으로 계약서 첨부"));
    await waitFor(() => expect(screen.getByText("취소")).toBeDisabled());

    resolveComplete();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });
});

const TEMPLATE_DETAIL = {
  id: "t1",
  categoryId: "nda" as const,
  name: "비밀유지계약서 표준",
  currentVersionNo: 1,
  createdById: "u1",
  createdByName: "김서연",
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
  currentVersion: {
    versionNo: 1,
    content: { type: "doc", content: [{ type: "paragraph" }] },
    clauseCount: null,
    createdById: "u1",
    createdByName: "김서연",
    createdAt: "2026-09-20T00:00:00.000Z",
  },
};

describe("StandardFormEditorModal — 양식 불러오기 상태", () => {
  it("불러오는 동안 스피너를 보여주고 '계약서 첨부'를 잠근다", async () => {
    // 끝나지 않는 조회로 "불러오는 중" 상태를 붙잡아 둔다.
    vi.spyOn(templatesApi, "getTemplate").mockImplementation(() => new Promise(() => {}));
    renderModal(vi.fn());

    expect(await screen.findByText("양식을 불러오는 중…")).toBeInTheDocument();
    expect(screen.getByText("이 내용으로 계약서 첨부")).toBeDisabled();
    expect(screen.queryByLabelText("계약서 작성")).not.toBeInTheDocument();
  });

  it("불러오기에 실패하면 실패 안내와 '다시 시도'를 보여준다", async () => {
    vi.spyOn(templatesApi, "getTemplate").mockRejectedValue(new Error("서버 오류"));
    renderModal(vi.fn());

    expect(await screen.findByText("양식을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeInTheDocument();
    expect(screen.getByText("이 내용으로 계약서 첨부")).toBeDisabled();
  });

  it("'다시 시도'를 누르면 양식을 다시 불러와 편집기를 연다", async () => {
    const getTemplate = vi
      .spyOn(templatesApi, "getTemplate")
      .mockRejectedValueOnce(new Error("서버 오류"))
      .mockResolvedValue(TEMPLATE_DETAIL);
    renderModal(vi.fn());
    await screen.findByText("양식을 불러오지 못했어요");

    await userEvent.click(screen.getByRole("button", { name: /다시 시도/ }));

    expect(await screen.findByLabelText("계약서 작성")).toBeInTheDocument();
    expect(screen.queryByText("양식을 불러오지 못했어요")).not.toBeInTheDocument();
    expect(getTemplate).toHaveBeenCalledTimes(2);
  });
});
