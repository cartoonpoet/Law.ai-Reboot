import { useState } from "react";
import { Avatar, Button, Icon } from "@lawkit/ui";
import type { CommentDto, FileAttachmentDto } from "@lawai/contracts";
import { MentionEditor } from "../../../components/ui/MentionEditor";
import { useMentionSuggestion } from "../hooks/useMentionSuggestion";
import { useFileUpload } from "../hooks/useFileUpload";
import { extractMentionUserIdsFromHtml, isHtmlBlank } from "../utils/mentionHtml";
import { sanitizeCommentHtml } from "../utils/sanitizeCommentHtml";
import { AVATAR_COLOR, ROLE_TAG_CLASS, type RoleVariant } from "./commentRole";
import { IconFile } from "../../../components/ui/EditorIcons";
import { formatBytes } from "../utils/formatBytes";
import { toApiUrl } from "../../../api/apiUrl";
import {
  FilePreviewModal,
  type PreviewFileRef,
} from "../../../components/filePreview";
import * as attachCss from "./attachmentChip.css";
import * as panelCss from "./commentPanel.css";
import * as css from "./commentItem.css";

// FileAttachmentDto → 미리보기 모달 ref 매핑.
const toPreviewRef = (att: FileAttachmentDto): PreviewFileRef => ({
  id: att.id,
  name: att.name,
  mimeType: att.mimeType,
});

interface CommentItemProps {
  comment: CommentDto;
  /** 시안 역할 구분 — 매핑/라벨은 `commentRole.ts` 단일 출처. */
  roleVariant: RoleVariant;
  roleLabel: string;
  formattedTime: string;
  // 본문(HTML 단편) + 멘션 userId 배열 + 첨부 id 배열을 받아 코멘트를 수정한다.
  // 멘션·첨부 모두 전체 교체 의미(빠진 첨부는 detach, 새 첨부는 attach).
  onEdit: (
    commentId: string,
    body: string,
    mentions: string[],
    attachmentIds: string[],
  ) => Promise<unknown>;
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
  const [isEditing, setIsEditing] = useState(false);
  // 미리보기 상태: previewAId 가 있으면 모달 open. previewBId 는 비교 모드(좌우).
  const [previewAId, setPreviewAId] = useState<string | null>(null);
  const [previewBId, setPreviewBId] = useState<string | null>(null);

  const isEdited = checkEdited(comment);
  const canModify = comment.isAuthor && !comment.isDeleted;
  const isSystem = roleVariant === "system";

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSaved = () => {
    // 저장 성공 시 useComments 가 목록을 invalidate → comment 가 최신으로 갱신된 채 읽기 모드 복귀.
    setIsEditing(false);
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
        src={comment.authorAvatarUrl ? toApiUrl(comment.authorAvatarUrl) : undefined}
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
          <CommentEditForm
            comment={comment}
            onSubmit={onEdit}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        ) : (
          // sanitize 본문(HTML 단편). DOMPurify CONFIG는 sanitizeCommentHtml.ts 단일 출처.
          // 멘션 강조·콘텐츠 노드 스타일은 commentItem.css.ts의 globalStyle이 토큰으로 적용한다(인라인 0).
          <>
            <div
              className={bubbleClassName}
              dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.body) }}
            />
            {comment.attachments && comment.attachments.length > 0 && (
              <div className={attachCss.downloadList}>
                {comment.attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    className={attachCss.downloadLink}
                    onClick={() => {
                      setPreviewAId(att.id);
                      setPreviewBId(null);
                    }}
                  >
                    <IconFile />
                    {att.name}
                    <span>· {formatBytes(att.size)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {previewAId && (
        <FilePreviewModal
          open
          fileA={
            comment.attachments.find((a) => a.id === previewAId)
              ? toPreviewRef(
                  comment.attachments.find((a) => a.id === previewAId)!,
                )
              : null
          }
          fileB={(() => {
            if (!previewBId) return null;
            const b = comment.attachments.find((a) => a.id === previewBId);
            return b ? toPreviewRef(b) : null;
          })()}
          candidates={comment.attachments.map(toPreviewRef)}
          contractId={comment.contractId}
          onChangeFileB={setPreviewBId}
          onClose={() => {
            setPreviewAId(null);
            setPreviewBId(null);
          }}
        />
      )}
    </div>
  );
}

interface CommentEditFormProps {
  comment: CommentDto;
  onSubmit: CommentItemProps["onEdit"];
  onCancel: () => void;
  onSaved: () => void;
}

/**
 * 코멘트 인라인 편집 폼 — 진입 시 새 마운트라 깨끗한 상태로 시작한다.
 *
 * - useFileUpload 를 comment.attachments 로 시드해 기존 첨부를 'done' 상태로 노출(추가/삭제 가능).
 * - 저장 성공 시 attachmentIds 배열(현재 done 상태) 을 onSubmit 으로 전달 → 백엔드가 전체교체.
 * - 취소/저장 모두 unmount 라 폼 내부 상태는 폐기. 다시 수정 들어가면 최신 comment.attachments 로 재시드.
 */
function CommentEditForm({
  comment,
  onSubmit,
  onCancel,
  onSaved,
}: CommentEditFormProps) {
  const suggestion = useMentionSuggestion();
  const upload = useFileUpload({
    contractId: comment.contractId,
    initialAttachments: comment.attachments,
  });
  const [draft, setDraft] = useState(comment.body);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isHtmlBlank(draft)) {
      setErrorText("코멘트 내용을 입력하세요.");
      return;
    }
    if (upload.hasPending) {
      setErrorText("첨부 업로드가 끝난 뒤 저장해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(
        comment.id,
        draft,
        extractMentionUserIdsFromHtml(draft),
        upload.getReadyIds(),
      );
      setErrorText(null);
      onSaved();
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "코멘트 수정에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={css.editForm}>
      <MentionEditor
        value={draft}
        onChange={setDraft}
        suggestion={suggestion}
        ariaLabel="코멘트 수정"
        placeholder="검토 의견을 남겨주세요. @로 멘션을 추가할 수 있어요."
        attachments={upload.attachments}
        onAddFiles={upload.addFiles}
        onRemoveAttachment={upload.removeAttachment}
      />
      {errorText && <span className={css.editError}>{errorText}</span>}
      <div className={css.editActions}>
        <Button
          type="button"
          variant="outline"
          color="secondary"
          size="small"
          onClick={onCancel}
          disabled={isSaving}
        >
          취소
        </Button>
        <Button
          type="button"
          size="small"
          onClick={handleSave}
          disabled={isSaving || upload.hasPending}
        >
          {isSaving ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}
