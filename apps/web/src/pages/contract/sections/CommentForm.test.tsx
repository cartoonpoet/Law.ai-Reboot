import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentForm } from "./CommentForm";

/**
 * CommentForm 단위 테스트 (인라인 @멘션 흐름).
 *
 * 입력은 tiptap 기반 MentionEditor지만 jsdom contenteditable 한계로 직접 타이핑이
 * 불가하므로, MentionEditor를 value/onChange를 노출하는 textarea 스텁으로 목킹한다.
 * body는 `@[이름](userId)` 마크업 문자열이며 제출 시 extractMentionUserIds로 userId[]를
 * 산출해 onSubmit(body, mentions)을 호출한다(마크업↔userId 산출은 mentionMarkup 단위 테스트로 보완).
 */

// MentionEditor를 textarea 스텁으로 대체 — value/onChange만 위임하면 마크업 in/out 검증이 가능.
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

// 멘션 후보 검색 훅은 suggestion 설정만 반환 — 스텁 에디터에선 미사용이라 빈 객체로 목킹.
vi.mock("../hooks/useMentionSuggestion", () => ({
  useMentionSuggestion: () => ({ char: "@", items: () => [], render: () => ({}) }),
}));

const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(<CommentForm onSubmit={onSubmit} />);
  return { onSubmit };
};

describe("CommentForm 멘션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("멘션 마크업이 포함된 본문 제출 시 onSubmit(body, [userId])를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // 에디터(스텁)에 멘션 마크업을 직접 입력 — 실제 에디터에선 @ 후보 선택으로 생성됨.
    // 마크업의 `[]()` 는 userEvent 키 디스크립터로 해석되므로 fireEvent.change로 값을 주입.
    const editor = screen.getByLabelText("코멘트 입력");
    fireEvent.change(editor, {
      target: { value: "@[오너](owner-1) 확인 부탁드려요" },
    });

    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        "@[오너](owner-1) 확인 부탁드려요",
        ["owner-1"],
      ),
    );
  });

  it("멘션 없이 제출하면 빈 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(screen.getByLabelText("코멘트 입력"), "멘션 없는 의견");
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("멘션 없는 의견", []),
    );
  });

  it("빈 본문(공백만)은 제출 가드로 onSubmit을 호출하지 않고 에러를 노출한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(screen.getByLabelText("코멘트 입력"), "   ");
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    expect(
      await screen.findByText("코멘트 내용을 입력하세요."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
