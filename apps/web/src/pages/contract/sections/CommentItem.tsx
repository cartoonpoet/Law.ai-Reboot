import { Fragment, useState } from "react";
import { Avatar, Button, Icon } from "@lawkit/ui";
import type { CommentDto } from "@lawai/contracts";
import { Tag } from "../../../components/ui/Tag";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import {
  extractMentionUserIds,
  parseMentionMarkup,
  stripMentionMarkup,
} from "../utils/mentionMarkup";
import * as panelCss from "./commentPanel.css";
import * as css from "./commentItem.css";

interface CommentItemProps {
  comment: CommentDto;
  isLegal: boolean;
  roleLabel: string;
  formattedTime: string;
  // 본문(@[이름](userId) 마크업) + 멘션 userId 배열을 받아 코멘트를 수정한다.
  // 멘션은 에디터에서 산출한 userId[]로 전체 교체한다.
  onEdit: (commentId: string, body: string, mentions: string[]) => Promise<unknown>;
  onDelete: (commentId: string) => Promise<unknown>;
}

// 수정 여부 판정(렌더 중 파생) — updatedAt 이 createdAt 보다 뒤면 수정됨.
const checkEdited = (comment: CommentDto): boolean =>
  comment.updatedAt > comment.createdAt;

/**
 * 코멘트 한 행 렌더 (SRP — CommentPanel 목록에서 분리).
 * 본인(isAuthor)·미삭제일 때만 수정/삭제 버튼, 삭제분은 placeholder,
 * updatedAt>createdAt 이면 "(수정됨)". 본문은 마크업을 인라인 하이라이트로 렌더하고,
 * 수정 진입 시 MentionEditor로 마크업을 노드 복원한다. 인라인 편집은 로컬 state 토글.
 */
export function CommentItem({
  comment,
  isLegal,
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
  // 본문 마크업을 세그먼트로 쪼개 인라인 렌더(text는 그대로, mention은 강조 span).
  const segments = parseMentionMarkup(comment.body);

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
    if (stripMentionMarkup(draft).trim().length === 0) {
      setErrorText("코멘트 내용을 입력하세요.");
      return;
    }
    setIsSaving(true);
    try {
      await onEdit(comment.id, draft, extractMentionUserIds(draft));
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
          <div className={panelCss.bubble}>
            {segments.map((segment, index) =>
              segment.type === "mention" ? (
                <span key={`${segment.userId}-${index}`} className={css.mentionInline}>
                  @{segment.name}
                </span>
              ) : (
                <Fragment key={`text-${index}`}>{segment.value}</Fragment>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
