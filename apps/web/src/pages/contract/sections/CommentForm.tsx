import { useState } from "react";
import { Button } from "@lawkit/ui";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { IconSend } from "../../../components/ui/EditorIcons";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import { extractMentionUserIdsFromHtml, isHtmlBlank } from "../utils/mentionHtml";
import * as css from "./commentForm.css";

interface CommentFormProps {
  // 본문(HTML 단편) + 멘션 userId 배열을 받아 코멘트를 생성한다(useComments.addComment).
  // 성공 시 에디터를 비운다.
  onSubmit: (body: string, mentions: string[]) => Promise<unknown>;
}

/** 시안 컴팩트 에디터 `.charcount`의 시각 한도(차단 안 함, 표시만). */
const MAX_LEN = 2000;

/**
 * 코멘트 작성 폼 — 시안 컴팩트 WYSIWYG(MentionEditor) + 등록 버튼.
 *
 * 본문은 HTML 단편. 제출 시 `extractMentionUserIdsFromHtml(body)`로 userId[]를 산출해
 * `onSubmit(body, mentions)`을 호출한다. 빈 본문 가드(`isHtmlBlank`)는 plain text 기준.
 * 툴바·pasteHint·charcount는 MentionEditor 컨테이너 안에 내장(시안 `.editor` 구조).
 */
export function CommentForm({ onSubmit }: CommentFormProps) {
  const suggestion = useMentionSuggestion();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmpty = isHtmlBlank(body);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty) {
      setError("코멘트 내용을 입력하세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(body, extractMentionUserIdsFromHtml(body));
      setBody("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "코멘트 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={css.form}>
      <MentionEditor
        value={body}
        onChange={setBody}
        suggestion={suggestion}
        ariaLabel="코멘트 입력"
        placeholder="검토 의견을 입력하세요. @로 담당자를 멘션할 수 있습니다."
        maxLength={MAX_LEN}
      />

      <div className={css.footRow}>
        {error ? <span className={css.error}>{error}</span> : <span />}
        <Button
          type="submit"
          size="medium"
          disabled={isSubmitting}
          iconLeft={<IconSend />}
        >
          {isSubmitting ? "등록 중…" : "코멘트 등록"}
        </Button>
      </div>
    </form>
  );
}
