import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentForm } from "./CommentForm";

/**
 * CommentForm 단위 테스트 (P2 HTML 본문 + WYSIWYG).
 *
 * 입력은 tiptap 기반 MentionEditor지만 jsdom contenteditable 한계로 직접 타이핑이
 * 불가하므로, MentionEditor를 value/onChange를 노출하는 textarea 스텁으로 목킹한다.
 * body는 HTML 단편이며, 멘션은 `<span data-mention data-id>`. 제출 시
 * `extractMentionUserIdsFromHtml(body)`로 userId[]를 산출해 onSubmit(body, mentions)을 호출한다.
 */

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

const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(<CommentForm onSubmit={onSubmit} contractId="k1" />);
  return { onSubmit };
};

describe("CommentForm 멘션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("멘션 span이 포함된 HTML 본문 제출 시 onSubmit(body, [userId])를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    const editor = screen.getByLabelText("코멘트 입력");
    const htmlBody =
      '<p><span data-mention data-id="owner-1">@오너</span> 확인 부탁드려요</p>';
    fireEvent.change(editor, { target: { value: htmlBody } });

    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(htmlBody, ["owner-1"], []),
    );
  });

  it("멘션 없이 제출하면 빈 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    const editor = screen.getByLabelText("코멘트 입력");
    fireEvent.change(editor, { target: { value: "<p>멘션 없는 의견</p>" } });
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("<p>멘션 없는 의견</p>", [], []),
    );
  });

  it("빈 본문(`<p></p>` 또는 공백만)은 제출 가드로 onSubmit을 호출하지 않고 에러를 노출한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    const editor = screen.getByLabelText("코멘트 입력");
    fireEvent.change(editor, { target: { value: "<p>   </p>" } });
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    expect(
      await screen.findByText("코멘트 내용을 입력하세요."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
