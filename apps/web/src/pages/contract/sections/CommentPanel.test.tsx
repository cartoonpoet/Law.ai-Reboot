import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentDto } from "@lawai/contracts";
import { CommentPanel } from "./CommentPanel";
import * as commentsApi from "../../../api/comments";

vi.mock("../../../api/comments");

// CommentForm/CommentItem이 쓰는 tiptap MentionEditor를 textarea 스텁으로 대체.
vi.mock("../../../components/ui/MentionEditor", () => ({
  MentionEditor: ({
    value,
    onChange,
    ariaLabel,
    placeholder,
  }: {
    value: string;
    onChange: (body: string) => void;
    ariaLabel: string;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("../hooks/useMentionSuggestion", () => ({
  useMentionSuggestion: () => ({ char: "@", items: () => [], render: () => ({}) }),
}));

const COMMENTS: CommentDto[] = [
  {
    id: "c1",
    contractId: "k1",
    authorId: "u1",
    authorName: "이법무",
    role: "inHouseCounsel",
    body: "<p>손해배상 한도 확인 필요</p>",
    createdAt: "2026-06-22T01:00:00.000Z",
    updatedAt: "2026-06-22T01:00:00.000Z",
    isDeleted: false,
    isAuthor: false,
    mentions: [],
  },
  {
    id: "c2",
    contractId: "k1",
    authorId: "u2",
    authorName: "박외주",
    role: "outsideCounsel",
    body: "<p>수정안 첨부드립니다</p>",
    createdAt: "2026-06-22T02:00:00.000Z",
    updatedAt: "2026-06-22T02:00:00.000Z",
    isDeleted: false,
    isAuthor: false,
    mentions: [],
  },
];

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CommentPanel contractId="k1" />
    </QueryClientProvider>,
  );
}

describe("CommentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commentsApi.listComments).mockResolvedValue(COMMENTS);
    vi.mocked(commentsApi.createComment).mockResolvedValue(COMMENTS[0]);
  });

  it("'검토 의견' 패널 타이틀과 실 코멘트 목록(작성자/역할)을 렌더한다", async () => {
    renderPanel();
    expect(screen.getByText("검토 의견")).toBeInTheDocument();
    expect(await screen.findByText("손해배상 한도 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("이법무")).toBeInTheDocument();
    expect(screen.getByText("박외주")).toBeInTheDocument();
    expect(screen.getByText("사내변호사")).toBeInTheDocument();
    expect(screen.getByText("사외변호사")).toBeInTheDocument();
  });

  it("코멘트가 없으면 시안 빈 상태 카드(제목+설명)를 렌더한다", async () => {
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("첫 검토 의견을 남겨보세요")).toBeInTheDocument();
    expect(
      screen.getByText("담당자에게 전달할 의견을 작성하면 검토 이력에 기록됩니다."),
    ).toBeInTheDocument();
  });

  it("본문 HTML 입력 후 제출하면 createComment(addComment)를 호출한다", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("손해배상 한도 확인 필요");
    const editor = screen.getByLabelText("코멘트 입력");
    fireEvent.change(editor, { target: { value: "<p>추가 검토 의견</p>" } });
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(commentsApi.createComment).toHaveBeenCalledWith(
        "k1",
        "<p>추가 검토 의견</p>",
        [],
      ),
    );
  });

  it("본인(isAuthor) 코멘트에는 수정/삭제 버튼, 멘션 인라인 표시, (수정됨)을 렌더한다", async () => {
    vi.mocked(commentsApi.listComments).mockResolvedValue([
      {
        id: "c9",
        contractId: "k1",
        authorId: "me",
        authorName: "나작성",
        role: "inHouseCounsel",
        body: '<p><span data-mention data-id="owner-1">@오너</span> 확인 부탁</p>',
        createdAt: "2026-06-22T01:00:00.000Z",
        updatedAt: "2026-06-22T05:00:00.000Z",
        isDeleted: false,
        isAuthor: true,
        mentions: [{ userId: "owner-1", name: "오너" }],
      },
    ]);
    renderPanel();
    await screen.findByText(/확인 부탁/);
    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /삭제/ })).toBeInTheDocument();
    // 멘션 라벨은 sanitize 본문에 텍스트로 노출.
    expect(screen.getByText(/@오너/)).toBeInTheDocument();
    expect(screen.getByText("(수정됨)")).toBeInTheDocument();
  });

  it("삭제된 코멘트는 placeholder 로 렌더하고 본문/버튼을 숨긴다", async () => {
    vi.mocked(commentsApi.listComments).mockResolvedValue([
      {
        id: "c10",
        contractId: "k1",
        authorId: "me",
        authorName: "나작성",
        role: "inHouseCounsel",
        body: "",
        createdAt: "2026-06-22T01:00:00.000Z",
        updatedAt: "2026-06-22T06:00:00.000Z",
        isDeleted: true,
        isAuthor: true,
        mentions: [],
      },
    ]);
    renderPanel();
    expect(await screen.findByText("삭제된 코멘트입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /수정/ })).not.toBeInTheDocument();
  });

it("빈 body(`<p></p>` 공백만)는 제출해도 createComment를 호출하지 않는다(클라 가드)", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("손해배상 한도 확인 필요");
    const editor = screen.getByLabelText("코멘트 입력");
    fireEvent.change(editor, { target: { value: "<p>   </p>" } });
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    expect(
      await screen.findByText("코멘트 내용을 입력하세요."),
    ).toBeInTheDocument();
    expect(commentsApi.createComment).not.toHaveBeenCalled();
  });
});
