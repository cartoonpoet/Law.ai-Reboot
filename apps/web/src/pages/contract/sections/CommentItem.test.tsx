import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentDto } from "@lawai/contracts";
import { CommentItem } from "./CommentItem";

/**
 * CommentItem 행 렌더/액션 단위 테스트.
 *
 * - isAuthor 면 수정/삭제 버튼 노출, isAuthor=false 면 숨김.
 * - isDeleted 면 placeholder + 버튼/본문 숨김.
 * - updatedAt > createdAt 이면 "(수정됨)" 표기.
 * - mentions 칩 렌더.
 * - 인라인 편집 저장 → onEdit, 삭제 → window.confirm 후 onDelete.
 */

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

  it("mentions 를 칩으로 렌더한다", () => {
    renderItem(
      makeComment({
        mentions: [
          { userId: "owner-1", name: "오너" },
          { userId: "cc-1", name: "참조자" },
        ],
      }),
    );
    expect(screen.getByText("오너")).toBeInTheDocument();
    expect(screen.getByText("참조자")).toBeInTheDocument();
  });

  it("인라인 편집 저장 시 onEdit(commentId, body)를 호출한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem(
      makeComment({
        isAuthor: true,
        mentions: [{ userId: "owner-1", name: "오너" }],
      }),
    );
    await user.click(screen.getByRole("button", { name: /수정/ }));
    const textarea = screen.getByDisplayValue("검토 의견입니다");
    await user.clear(textarea);
    await user.type(textarea, "수정된 내용");
    await user.click(screen.getByRole("button", { name: "저장" }));
    // 멘션 보존은 CommentPanel 이 처리하므로 CommentItem 은 body 만 전달한다.
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith("c1", "수정된 내용"),
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
