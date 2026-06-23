import { useState } from "react";
import { Button, Icon } from "@lawkit/ui";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import { extractMentionUserIds, stripMentionMarkup } from "../utils/mentionMarkup";
import * as css from "./commentForm.css";

interface CommentFormProps {
  // 본문(@[이름](userId) 마크업) + 멘션 userId 배열을 받아 코멘트를 생성한다(useComments.addComment).
  // 성공 시 에디터를 비운다.
  onSubmit: (body: string, mentions: string[]) => Promise<unknown>;
}

/**
 * 코멘트 작성 폼 — 인라인 @멘션 에디터(MentionEditor) 단일 입력.
 * 에디터 상태(body 마크업)를 로컬 state로 보유하고, 제출은 폼 액션이 아니라
 * 핸들러에서 직접 처리한다(tiptap 콘텐츠는 FormData에 안 실리므로). 제출 시
 * extractMentionUserIds(body)로 userId[]를 산출해 onSubmit(body, mentions)을 호출한다.
 */
export function CommentForm({ onSubmit }: CommentFormProps) {
  const suggestion = useMentionSuggestion();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 마크업을 표시이름으로 치환·trim 한 뒤 비었으면 제출을 막는다(렌더/제출 시 파생).
  const isEmpty = stripMentionMarkup(body).trim().length === 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty) {
      setError("코멘트 내용을 입력하세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(body, extractMentionUserIds(body));
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
        placeholder="검토 의견을 남겨주세요. @로 멘션을 추가할 수 있어요."
      />

      <div className={css.footRow}>
        {error ? <span className={css.error}>{error}</span> : <span />}
        <Button
          type="submit"
          size="medium"
          disabled={isSubmitting}
          iconLeft={<Icon name="messageSquare" size="sm" />}
        >
          {isSubmitting ? "등록 중…" : "코멘트 등록"}
        </Button>
      </div>
    </form>
  );
}
