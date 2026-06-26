import { useState } from "react";
import { Avatar, Button, Icon } from "@lawkit/ui";
import type { CommentDto } from "@lawai/contracts";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import { extractMentionUserIdsFromHtml, isHtmlBlank } from "../utils/mentionHtml";
import { sanitizeCommentHtml } from "../utils/sanitizeCommentHtml";
import { AVATAR_COLOR, ROLE_TAG_CLASS, type RoleVariant } from "./commentRole";
import * as panelCss from "./commentPanel.css";
import * as css from "./commentItem.css";

interface CommentItemProps {
  comment: CommentDto;
  /** 시안 역할 구분 — 매핑/라벨은 `commentRole.ts` 단일 출처. */
  roleVariant: RoleVariant;
  roleLabel: string;
  formattedTime: string;
  // 본문(HTML 단편) + 멘션 userId 배열을 받아 코멘트를 수정한다.
  // 멘션은 에디터에서 산출한 userId[]로 전체 교체한다.
  onEdit: (commentId: string, body: string, mentions: string[]) => Promise<unknown>;
  onDelete: (commentId: string) => Promise<unknown>;
}

// 수정 여부 판정(렌더 중 파생) — updatedAt 이 createdAt 보다 뒤면 수정됨.
const checkEdited = (comment: CommentDto): boolean =>
  comment.updatedAt > comment.createdAt;

/**
 * 코멘트 한 행 렌더 (SRP — CommentPanel 목록에서 분리).
 *
 * - 본문은 sanitize HTML을 `dangerouslySetInnerHTML`로 렌더(보안: DOMPurify가 화이트리스트만 통과).
 * - 본인(isAuthor)·미삭제일 때만 수정/삭제 액션(hover 시 등장 — CSS transition).
 * - 삭제분은 placeholder(휴지통 아이콘 + 텍스트), updatedAt>createdAt이면 "(수정됨)".
 * - 시스템 메시지(role==='system')는 차분 톤(bubble 없음). statepill은 데이터원 미정 — 후속.
 */
export function CommentItem({
  comment,
  roleVariant,
  roleLabel,
  formattedTime,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const suggestion = useMentionSuggestion();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEdited = checkEdited(comment);
  const canModify = comment.isAuthor && !comment.isDeleted;
  const isSystem = roleVariant === "system";

  const handleStartEdit = () => {
    setDraft(comment.body);
    setErrorText(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrorText(null);
  };

  const handleSave = async () => {
    if (isHtmlBlank(draft)) {
      setErrorText("코멘트 내용을 입력하세요.");
      return;
    }
    setIsSaving(true);
    try {
      await onEdit(comment.id, draft, extractMentionUserIdsFromHtml(draft));
      setIsEditing(false);
      setErrorText(null);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "코멘트 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("이 코멘트를 삭제할까요?")) return;
    try {
      await onDelete(comment.id);
    } catch (err) {
      // 읽기 모드에는 errorText 표시 슬롯이 없어, confirm과 동일한 명령형 경계로 실패를 알린다.
      window.alert(err instanceof Error ? err.message : "코멘트 삭제에 실패했습니다.");
    }
  };

  // 본인 코멘트는 own 변형(primary tint). system은 bubble 비활성(차분 톤).
  const bubbleClassName = isSystem
    ? `${css.bubble} ${css.bubbleSystem}`
    : comment.isAuthor
      ? `${css.bubble} ${css.bubbleOwn}`
      : css.bubble;

  return (
    <div className={panelCss.row}>
      <Avatar
        initials={comment.authorName[0] ?? "?"}
        size="sm"
        color={AVATAR_COLOR[roleVariant]}
      />
      <div className={panelCss.main}>
        <div className={panelCss.head}>
          <span className={panelCss.author}>{comment.authorName}</span>
          <span className={`${css.roleTag} ${ROLE_TAG_CLASS[roleVariant]}`}>
            {roleLabel}
          </span>
          <span className={panelCss.time}>{formattedTime}</span>
          {isEdited && !comment.isDeleted && (
            <span className={css.edited}>(수정됨)</span>
          )}
          {canModify && !isEditing && (
            <span className={css.actions}>
              <button type="button" className={css.actionButton} onClick={handleStartEdit}>
                수정
              </button>
              <button
                type="button"
                className={`${css.actionButton} ${css.dangerButton}`}
                onClick={handleDelete}
              >
                삭제
              </button>
            </span>
          )}
        </div>

        {comment.isDeleted ? (
          <div className={css.deletedBubble}>
            <Icon name="trash" size="sm" />
            삭제된 코멘트입니다.
          </div>
        ) : isEditing ? (
          <div className={css.editForm}>
            <MentionEditor
              value={draft}
              onChange={setDraft}
              suggestion={suggestion}
              ariaLabel="코멘트 수정"
              placeholder="검토 의견을 남겨주세요. @로 멘션을 추가할 수 있어요."
            />
            {errorText && <span className={css.editError}>{errorText}</span>}
            <div className={css.editActions}>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                size="small"
                onClick={handleCancel}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button type="button" size="small" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "저장 중…" : "저장"}
              </Button>
            </div>
          </div>
        ) : (
          // sanitize 본문(HTML 단편). DOMPurify CONFIG는 sanitizeCommentHtml.ts 단일 출처.
          // 멘션 강조·콘텐츠 노드 스타일은 commentItem.css.ts의 globalStyle이 토큰으로 적용한다(인라인 0).
          <div
            className={bubbleClassName}
            dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.body) }}
          />
        )}
      </div>
    </div>
  );
}
