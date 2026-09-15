import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentDto } from "@lawai/contracts";
import { CommentItem } from "./CommentItem";

/**
 * CommentItem 행 렌더/액션 단위 테스트 (P2 HTML 본문 + sanitize).
 *
 * - isAuthor 면 수정/삭제 버튼 노출(hover 시 등장, DOM에는 존재), isAuthor=false 면 숨김.
 * - isDeleted 면 placeholder + 버튼/본문 숨김.
 * - updatedAt > createdAt 이면 "(수정됨)" 표기.
 * - 본문 HTML(`<span data-mention>`)은 sanitize 후 `dangerouslySetInnerHTML`로 렌더.
 * - 인라인 편집 저장 → onEdit(commentId, body, mentions, attachmentIds) 4-인자, 삭제 → confirm 후 onDelete.
 *
 * 수정모드 입력은 tiptap MentionEditor지만 jsdom contenteditable 한계로 직접 타이핑이
 * 불가하므로 value/onChange를 노출하는 textarea 스텁으로 목킹한다.
 */

vi.mock("../../../components/ui/MentionEditor", () => ({
  MentionEditor: ({
    value,
    onChange,
    ariaLabel,
    attachments,
  }: {
    value: string;
    onChange: (body: string) => void;
    ariaLabel: string;
    attachments?: { localId: string; name: string }[];
  }) => (
    <div>
      <textarea
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {attachments?.map((a) => (
        <span key={a.localId} data-testid={`att-${a.localId}`}>
          {a.name}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("../hooks/useMentionSuggestion", () => ({
  useMentionSuggestion: () => ({ char: "@", items: () => [], render: () => ({}) }),
}));

const makeComment = (over: Partial<CommentDto> = {}): CommentDto => ({
  id: "c1",
  contractId: "k1",
  authorId: "u1",
  authorName: "이법무",
  authorAvatarUrl: null,
  role: "inHouseCounsel",
  body: "<p>검토 의견입니다</p>",
  createdAt: "2026-06-22T01:00:00.000Z",
  updatedAt: "2026-06-22T01:00:00.000Z",
  isDeleted: false,
  isAuthor: false,
  mentions: [],
  attachments: [],
  ...over,
});

const renderItem = (
  comment: CommentDto,
  handlers: {
    onEdit?: ReturnType<typeof vi.fn>;
    onDelete?: ReturnType<typeof vi.fn>;
  } = {},
) => {
  const onEdit = handlers.onEdit ?? vi.fn().mockResolvedValue(undefined);
  const onDelete = handlers.onDelete ?? vi.fn().mockResolvedValue(undefined);
  render(
    <CommentItem
      comment={comment}
      roleVariant="legal"
      roleLabel="사내변호사"
      formattedTime="2026-06-22 10:00"
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { onEdit, onDelete };
};

describe("CommentItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isAuthor=true 면 수정/삭제 버튼이 DOM에 존재한다(hover 시각 노출은 CSS)", () => {
    renderItem(makeComment({ isAuthor: true }));
    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /삭제/ })).toBeInTheDocument();
  });

  it("isAuthor=false 면 수정/삭제 버튼을 렌더하지 않는다", () => {
    renderItem(makeComment({ isAuthor: false }));
    expect(screen.queryByRole("button", { name: /수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /삭제/ })).not.toBeInTheDocument();
  });

  it("isDeleted 면 placeholder 를 렌더하고 본문·버튼을 숨긴다", () => {
    renderItem(
      makeComment({ isDeleted: true, isAuthor: true, body: "" }),
    );
    expect(screen.getByText("삭제된 코멘트입니다.")).toBeInTheDocument();
    expect(screen.queryByText("검토 의견입니다")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /수정/ })).not.toBeInTheDocument();
  });

  it("updatedAt > createdAt 이면 (수정됨)을 표기한다", () => {
    renderItem(
      makeComment({ updatedAt: "2026-06-22T03:00:00.000Z" }),
    );
    expect(screen.getByText("(수정됨)")).toBeInTheDocument();
  });

  it("updatedAt == createdAt 이면 (수정됨)을 표기하지 않는다", () => {
    renderItem(makeComment());
    expect(screen.queryByText("(수정됨)")).not.toBeInTheDocument();
  });

  it("본문 HTML의 멘션 span(@label)을 sanitize 후 인라인 렌더한다", () => {
    renderItem(
      makeComment({
        body: '<p><span data-mention data-id="owner-1">@오너</span> 확인 부탁 <span data-mention data-id="cc-1">@참조자</span></p>',
        mentions: [
          { userId: "owner-1", name: "오너" },
          { userId: "cc-1", name: "참조자" },
        ],
      }),
    );
    // sanitize 본문은 dangerouslySetInnerHTML로 렌더돼 텍스트 노드로 노출된다.
    expect(screen.getByText(/@오너/)).toBeInTheDocument();
    expect(screen.getByText(/@참조자/)).toBeInTheDocument();
    expect(screen.getByText(/확인 부탁/)).toBeInTheDocument();
  });

  it("script 등 위험 태그는 sanitize로 제거된다", () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({
          body: '<p>안녕</p><script>alert("x")</script>',
        })}
        roleVariant="legal"
        roleLabel="사내변호사"
        formattedTime="2026-06-22 10:00"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("안녕")).toBeInTheDocument();
  });

  it("인라인 편집 저장 시 onEdit(commentId, body, mentions)를 호출한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({
        isAuthor: true,
        body: "<p>원본 의견</p>",
      }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    const editor = screen.getByLabelText("코멘트 수정");
    // 스텁 textarea — `<>` 디스크립터 회피 위해 fireEvent.change로 값 주입.
    fireEvent.change(editor, {
      target: {
        value:
          '<p><span data-mention data-id="owner-1">@오너</span> 수정된 내용</p>',
      },
    });
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith(
        "c1",
        '<p><span data-mention data-id="owner-1">@오너</span> 수정된 내용</p>',
        ["owner-1"],
        [],
      ),
    );
  });

  it("멘션 없이 수정 저장하면 빈 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({ isAuthor: true, body: "<p>원본</p>" }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    const editor = screen.getByLabelText("코멘트 수정");
    fireEvent.change(editor, { target: { value: "<p>멘션 없이 수정</p>" } });
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith(
        "c1",
        "<p>멘션 없이 수정</p>",
        [],
        [],
      ),
    );
  });

  it("기존 첨부가 있는 코멘트는 수정 모드 진입 시 첨부 칩으로 노출되고 attachmentIds 로 전달된다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({
        isAuthor: true,
        body: "<p>원본</p>",
        attachments: [
          {
            id: "f-1",
            name: "초안.pdf",
            size: 1234,
            mimeType: "application/pdf",
            sha256: null,
            createdAt: "2026-06-22T01:00:00.000Z",
          },
        ],
      }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    // 시드된 첨부 칩이 노출돼야 한다.
    expect(screen.getByText("초안.pdf")).toBeInTheDocument();
    const editor = screen.getByLabelText("코멘트 수정");
    fireEvent.change(editor, { target: { value: "<p>유지 + 수정</p>" } });
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith(
        "c1",
        "<p>유지 + 수정</p>",
        [],
        ["f-1"],
      ),
    );
  });

  it("빈 본문(`<p></p>`)으로 저장 시 onEdit 호출하지 않고 에러를 노출한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({ isAuthor: true, body: "<p>원본</p>" }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    const editor = screen.getByLabelText("코멘트 수정");
    fireEvent.change(editor, { target: { value: "<p></p>" } });
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("코멘트 내용을 입력하세요.")).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("삭제 버튼 클릭 시 confirm 후 onDelete(commentId)를 호출한다", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onDelete } = renderItem(makeComment({ isAuthor: true }));
    await user.click(screen.getByRole("button", { name: /삭제/ }));
    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("c1"));
    confirmSpy.mockRestore();
  });

  it("삭제 confirm 취소 시 onDelete 를 호출하지 않는다", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onDelete } = renderItem(makeComment({ isAuthor: true }));
    await user.click(screen.getByRole("button", { name: /삭제/ }));
    expect(onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
