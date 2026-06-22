import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Icon, Input } from "@lawkit/ui";
import type { DirectoryEntry } from "../../../api/directory";
import { useCommentMention } from "../hooks/useCommentMention";
import * as css from "./commentForm.css";

interface CommentFormProps {
  // 본문 + 멘션 userId 배열을 받아 코멘트를 생성한다(useComments.addComment).
  // 성공 시 입력·멘션을 비운다.
  onSubmit: (body: string, mentions: string[]) => Promise<unknown>;
}

interface ActionState {
  error: string | null;
}

const INITIAL: ActionState = { error: null };

/**
 * 코멘트 작성 폼 — React 19 폼 액션(useActionState) + useFormStatus 로 pending.
 * 본문(body) + 멘션 입력(useCommentMention 으로 선택 상태 분리). 제출 시 body+mentions 전송.
 */
export function CommentForm({ onSubmit }: CommentFormProps) {
  // 제출 성공 시 form 을 선언적으로 재마운트(key 교체)해 입력을 비운다 — DOM 직접 reset 회피.
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const { mentions, mentionIds, candidates, search, addMention, removeMention, reset } =
    useCommentMention();

  // 검색어가 있을 때만 후보 드롭다운 노출(렌더 중 파생).
  const isSearching = query.trim().length > 0;

  const handleSearchChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handlePick = (entry: DirectoryEntry) => {
    addMention(entry);
    setQuery("");
    search("");
  };

  const submitComment = async (
    _prev: ActionState,
    formData: FormData,
  ): Promise<ActionState> => {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return { error: "코멘트 내용을 입력하세요." };
    try {
      await onSubmit(body, mentionIds);
      setFormKey((k) => k + 1);
      reset();
      setQuery("");
      return INITIAL;
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "코멘트 등록에 실패했습니다.",
      };
    }
  };

  const [state, formAction] = useActionState(submitComment, INITIAL);

  return (
    <form key={formKey} action={formAction} className={css.form}>
      <textarea
        name="body"
        className={css.textarea}
        placeholder="검토 의견을 남겨주세요."
      />

      <div className={css.mentionWrap}>
        <div className={css.mentionSearchRow}>
          <Input
            value={query}
            placeholder="멘션 추가 — 이름·부서로 검색"
            rightIcon={<Icon name="atSign" size="sm" />}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {isSearching && (
            <div className={css.mentionDropdown}>
              {candidates.length === 0 ? (
                <div className={css.mentionEmpty}>검색 결과가 없습니다.</div>
              ) : (
                candidates.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={css.mentionOption}
                    onClick={() => handlePick(u)}
                  >
                    <Icon name="atSign" size="sm" />
                    {u.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {mentions.length > 0 && (
          <div className={css.chipRow}>
            {mentions.map((m) => (
              <span key={m.userId} className={css.chip}>
                {m.name}
                <button
                  type="button"
                  className={css.chipRemove}
                  aria-label={`${m.name} 멘션 제거`}
                  onClick={() => removeMention(m.userId)}
                >
                  <Icon name="x" size="sm" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
