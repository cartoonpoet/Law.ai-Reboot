import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentDto } from "@lawai/contracts";
import { CommentItem } from "./CommentItem";

/**
 * CommentItem 행 렌더/액션 단위 테스트 (인라인 @멘션).
 *
 * - isAuthor 면 수정/삭제 버튼 노출, isAuthor=false 면 숨김.
 * - isDeleted 면 placeholder + 버튼/본문 숨김.
 * - updatedAt > createdAt 이면 "(수정됨)" 표기.
 * - 본문 마크업(@[이름](userId))을 @이름 인라인 하이라이트로 렌더(별도 칩 row 없음).
 * - 인라인 편집 저장 → onEdit(commentId, body, mentions) 3-인자, 삭제 → confirm 후 onDelete.
 *
 * 수정모드 입력은 tiptap MentionEditor지만 jsdom contenteditable 한계로 직접 타이핑이
 * 불가하므로 value/onChange를 노출하는 textarea 스텁으로 목킹한다.
 */

// MentionEditor를 textarea 스텁으로 대체 — 수정모드에서 마크업 in/out 검증.
vi.mock("../../../components/ui/MentionEditor", () => ({
  MentionEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (body: string) => void;
    ariaLabel: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
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
  role: "inHouseCounsel",
  body: "검토 의견입니다",
  createdAt: "2026-06-22T01:00:00.000Z",
  updatedAt: "2026-06-22T01:00:00.000Z",
  isDeleted: false,
  isAuthor: false,
  mentions: [],
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
      isLegal
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

  it("isAuthor=true 면 수정/삭제 버튼을 노출한다", () => {
    renderItem(makeComment({ isAuthor: true }));
    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /삭제/ })).toBeInTheDocument();
  });

  it("isAuthor=false 면 수정/삭제 버튼을 숨긴다", () => {
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

  it("본문 마크업의 멘션을 @이름 인라인 하이라이트로 렌더한다(별도 칩 row 없음)", () => {
    renderItem(
      makeComment({
        body: "@[오너](owner-1) 확인 부탁 @[참조자](cc-1)",
        mentions: [
          { userId: "owner-1", name: "오너" },
          { userId: "cc-1", name: "참조자" },
        ],
      }),
    );
    // 본문 인라인에 @이름 형태로 노출(텍스트 세그먼트와 함께 한 버블에 렌더).
    expect(screen.getByText("@오너")).toBeInTheDocument();
    expect(screen.getByText("@참조자")).toBeInTheDocument();
    expect(screen.getByText(/확인 부탁/)).toBeInTheDocument();
  });

  it("인라인 편집 저장 시 onEdit(commentId, body, mentions)를 호출한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({
        isAuthor: true,
        body: "원본 의견",
      }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    // 스텁 에디터(textarea)는 초기 value=comment.body(마크업)로 진입.
    // 마크업의 `[]()` 는 userEvent 키 디스크립터로 해석되므로 fireEvent.change로 값을 주입.
    const editor = screen.getByLabelText("코멘트 수정");
    fireEvent.change(editor, {
      target: { value: "@[오너](owner-1) 수정된 내용" },
    });
    await user.click(screen.getByRole("button", { name: "저장" }));
    // 에디터 산출 userId[]를 3번째 인자로 함께 전달.
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith(
        "c1",
        "@[오너](owner-1) 수정된 내용",
        ["owner-1"],
      ),
    );
  });

  it("멘션 없이 수정 저장하면 빈 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({ isAuthor: true, body: "원본" }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    const editor = screen.getByLabelText("코멘트 수정");
    await user.clear(editor);
    await user.type(editor, "멘션 없이 수정");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith("c1", "멘션 없이 수정", []),
    );
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
