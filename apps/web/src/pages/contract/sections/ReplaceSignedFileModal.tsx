import { useState } from "react";
import { Modal, Button, Alert, FileUploadArea, FileItem } from "@lawkit/ui";
import { useReplaceSignedFile } from "../hooks/useReplaceSignedFile";
import { useFileUpload } from "../hooks/useFileUpload";
import { formatBytes } from "../utils/formatBytes";
import * as css from "./completeSigningModal.css";

interface ReplaceSignedFileModalProps {
  contractId: string;
  onClose: () => void;
}

/**
 * 서명본 교체 모달 — 새 서명본 한 건 업로드 + 교체 사유.
 *
 * 체결 처리 모달과 같은 이유로 파일은 한 건만, 업로드가 실패(error)한 경우에만 제거를 허용한다
 * (confirm 이 업로드 중에 이미 파일 행을 만들 수 있어 그 전에 지우면 고아 첨부가 남는다 — CompleteSigningModal 참고).
 * 기존 서명본은 서버가 지우지 않고 첨부로 내려 이력으로 남긴다.
 */
export const ReplaceSignedFileModal = ({ contractId, onClose }: ReplaceSignedFileModalProps) => {
  const upload = useFileUpload({ contractId });
  const { submit, isPending, error } = useReplaceSignedFile(contractId);
  const [reason, setReason] = useState("");
  const [hasExtraFiles, setHasExtraFiles] = useState(false);

  const attachment = upload.attachments[0] ?? null;
  const canRemove = attachment?.status === "error";
  const fileId = attachment?.status === "done" ? (attachment.attachment?.id ?? null) : null;
  const trimmedReason = reason.trim();
  const canConfirm = Boolean(fileId) && trimmedReason.length > 0 && !isPending;

  const handleAddFiles = (files: File[]) => {
    setHasExtraFiles(files.length > 1);
    void upload.addFiles(files.slice(0, 1));
  };

  const handleConfirm = () => {
    if (!fileId || !trimmedReason) return;
    submit({ fileId, reason: trimmedReason }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="서명본 교체"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            서명본 교체
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <Alert type="info" size="small">
          기존 서명본은 지워지지 않고 <b>첨부</b>로 옮겨져 이력으로 남습니다. 교체 사유는 변경 기록에 남습니다.
        </Alert>

        <div>
          <div className={css.fieldLabel}>
            새 서명본<span className={css.required}>*</span>
          </div>
          {!attachment && (
            <>
              <p className={css.uploadNotice}>
                업로드한 파일은 계약에 영구히 첨부됩니다. 업로드 전에 파일을 다시 확인하세요.
              </p>
              <FileUploadArea
                variant="basic"
                description="서명·날인이 완료된 올바른 원본"
                onFilesAdded={handleAddFiles}
              />
            </>
          )}
          {hasExtraFiles && (
            <p className={css.warnNotice}>
              서명본은 한 건만 첨부할 수 있어 첫 번째 파일만 사용했습니다.
            </p>
          )}
          {attachment && (
            <div className={css.fileList}>
              <FileItem
                filename={attachment.name}
                fileMeta={
                  attachment.status === "error"
                    ? (attachment.reason ?? "업로드 실패")
                    : attachment.status === "done"
                      ? formatBytes(attachment.size)
                      : "업로드 중…"
                }
                onDelete={
                  canRemove ? () => upload.removeAttachment(attachment.localId) : undefined
                }
              />
            </div>
          )}
        </div>

        <div>
          <div className={css.fieldLabel}>
            교체 사유<span className={css.required}>*</span>
          </div>
          <textarea
            className={css.textarea}
            rows={2}
            maxLength={500}
            placeholder="예: 날인이 빠진 파일을 잘못 올림"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && <p className={css.error}>{error}</p>}
      </div>
    </Modal>
  );
};
