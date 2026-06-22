import { useState } from "react";
import { Avatar, Button, Icon } from "@lawkit/ui";
import type { CommentDto } from "@lawai/contracts";
import { Tag } from "../../../components/ui/Tag";
import * as panelCss from "./commentPanel.css";
import * as css from "./commentItem.css";

interface CommentItemProps {
  comment: CommentDto;
  isLegal: boolean;
  roleLabel: string;
  formattedTime: string;
  // 본문 수정 — body 만 받는다. 멘션 보존(전체 교체)은 CommentPanel 이 처리한다.
  onEdit: (commentId: string, body: string) => Promise<unknown>;
  onDelete: (commentId: string) => Promise<unknown>;
}

// 수정 여부 판정(렌더 중 파생) — updatedAt 이 createdAt 보다 뒤면 수정됨.
const checkEdited = (comment: CommentDto): boolean =>
  comment.updatedAt > comment.createdAt;

/**
 * 코멘트 한 행 렌더 (SRP — CommentPanel 목록에서 분리).
 * 본인(isAuthor)·미삭제일 때만 수정/삭제 버튼, 삭제분은 placeholder,
 * updatedAt>createdAt 이면 "(수정됨)", 멘션은 칩으로 표시. 인라인 편집은 로컬 state 토글.
 */
export function CommentItem({
  comment,
  isLegal,
  roleLabel,
  formattedTime,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEdited = checkEdited(comment);
  const canModify = comment.isAuthor && !comment.isDeleted;

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
    const body = draft.trim();
    if (!body) {
      setErrorText("코멘트 내용을 입력하세요.");
      return;
    }
    setIsSaving(true);
    try {
      await onEdit(comment.id, body);
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
    await onDelete(comment.id);
  };

  return (
    <div className={panelCss.row}>
      <Avatar
        initials={comment.authorName[0] ?? "?"}
        size="sm"
        color={isLegal ? "primary" : "secondary"}
      />
      <div className={panelCss.main}>
        <div className={panelCss.head}>
          <span className={panelCss.author}>{comment.authorName}</span>
          <Tag color={isLegal ? "primary" : "neutral"}>{roleLabel}</Tag>
          <span className={panelCss.time}>{formattedTime}</span>
          {isEdited && !comment.isDeleted && (
            <span className={css.edited}>(수정됨)</span>
          )}
          {canModify && !isEditing && (
            <span className={css.actions}>
              <button type="button" className={css.actionButton} onClick={handleStartEdit}>
                <Icon name="edit" size="sm" />
                수정
              </button>
              <button
                type="button"
                className={`${css.actionButton} ${css.dangerButton}`}
                onClick={handleDelete}
              >
                <Icon name="trash" size="sm" />
                삭제
              </button>
            </span>
          )}
        </div>

        {comment.isDeleted ? (
          <div className={css.deletedBubble}>삭제된 코멘트입니다.</div>
        ) : isEditing ? (
          <div className={css.editForm}>
            <textarea
              className={css.editTextarea}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="검토 의견을 남겨주세요."
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
          <>
            <div className={panelCss.bubble}>{comment.body}</div>
            {comment.mentions.length > 0 && (
              <div className={css.mentionRow}>
                {comment.mentions.map((m) => (
                  <span key={m.userId} className={css.mentionChip}>
                    <Icon name="atSign" size="sm" />
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
