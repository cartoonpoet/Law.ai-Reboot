import { useState } from "react";
import { Button } from "@lawkit/ui";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { IconSend } from "../../../components/ui/EditorIcons";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import { useFileUpload } from "../hooks/useFileUpload";
import { extractMentionUserIdsFromHtml, isHtmlBlank } from "../utils/mentionHtml";
import * as css from "./commentForm.css";

interface CommentFormProps {
  // 본문(HTML 단편) + 멘션 userId 배열 + 첨부 id 배열을 받아 코멘트를 생성한다.
  // 성공 시 에디터/첨부 상태를 비운다.
  onSubmit: (
    body: string,
    mentions: string[],
    attachmentIds: string[],
  ) => Promise<unknown>;
  /** 선업로드를 위해 contractId 필요(presign 검증·storageKey 경로). */
  contractId: string;
}

/** 시안 컴팩트 에디터 `.charcount`의 시각 한도(차단 안 함, 표시만). */
const MAX_LEN = 2000;

/**
 * 코멘트 작성 폼 — 시안 컴팩트 WYSIWYG(MentionEditor) + 첨부(P3) + 등록 버튼.
 *
 * 본문은 HTML 단편. 첨부는 presign/confirm 으로 선업로드 후 attachmentIds 만 전달.
 * 업로드 진행 중이면 등록 버튼 비활성(hasPending).
 */
export function CommentForm({ onSubmit, contractId }: CommentFormProps) {
  const suggestion = useMentionSuggestion();
  const upload = useFileUpload({ contractId });
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
    if (upload.hasPending) {
      setError("첨부 업로드가 끝난 뒤 등록해 주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(
        body,
        extractMentionUserIdsFromHtml(body),
        upload.getReadyIds(),
      );
      setBody("");
      upload.reset();
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
        attachments={upload.attachments}
        onAddFiles={upload.addFiles}
        onRemoveAttachment={upload.removeAttachment}
      />

      <div className={css.footRow}>
        {error ? <span className={css.error}>{error}</span> : <span />}
        <Button
          type="submit"
          size="medium"
          disabled={isSubmitting || upload.hasPending}
          iconLeft={<IconSend />}
        >
          {isSubmitting ? "등록 중…" : "코멘트 등록"}
        </Button>
      </div>
    </form>
  );
}
