import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, Icon } from "@lawkit/ui";
import * as css from "./commentForm.css";

interface CommentFormProps {
  // 본문을 받아 코멘트를 생성한다(useComments.addComment). 성공 시 입력을 비운다.
  onSubmit: (body: string) => Promise<unknown>;
}

interface ActionState {
  error: string | null;
}

const INITIAL: ActionState = { error: null };

/** 코멘트 작성 폼 — React 19 폼 액션(useActionState) + useFormStatus 로 pending. 단일 필드(body). */
export function CommentForm({ onSubmit }: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitComment = async (
    _prev: ActionState,
    formData: FormData,
  ): Promise<ActionState> => {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return { error: "코멘트 내용을 입력하세요." };
    try {
      await onSubmit(body);
      formRef.current?.reset();
      return INITIAL;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "코멘트 등록에 실패했습니다." };
    }
  };

  const [state, formAction] = useActionState(submitComment, INITIAL);

  return (
    <form ref={formRef} action={formAction} className={css.form}>
      <textarea
        name="body"
        className={css.textarea}
        placeholder="검토 의견을 남겨주세요."
      />
      <div className={css.footRow}>
        {state.error ? <span className={css.error}>{state.error}</span> : <span />}
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="medium"
      disabled={pending}
      iconLeft={<Icon name="messageSquare" size="sm" />}
    >
      {pending ? "등록 중…" : "코멘트 등록"}
    </Button>
  );
}
