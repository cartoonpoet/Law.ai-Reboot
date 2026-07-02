import { IconClose, IconFile } from "../../../components/ui/EditorIcons";
import type { AttachmentState } from "../hooks/useFileUpload";
import { formatBytes } from "../utils/formatBytes";
import * as css from "./attachmentChip.css";

interface AttachmentChipProps {
  attachment: AttachmentState;
  onRemove: (localId: string) => void;
}

const STATUS_LABEL: Record<AttachmentState["status"], string> = {
  pending: "대기 중…",
  uploading: "업로드 중…",
  done: "",
  error: "",
};

/** 첨부 칩 — 시안 .filechip. 상태(pending/uploading/done/error) 시각화 + 제거 버튼. */
export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  return (
    <span className={css.chip} data-status={attachment.status}>
      <span className={css.chipIcon}>
        <IconFile />
      </span>
      <span className={css.chipName} title={attachment.name}>
        {attachment.name}
      </span>
      <span className={css.chipSize}>{formatBytes(attachment.size)}</span>
      {attachment.status === "error" ? (
        <span className={css.chipError}>{attachment.reason ?? "실패"}</span>
      ) : STATUS_LABEL[attachment.status] ? (
        <span className={css.chipStatus}>
          {STATUS_LABEL[attachment.status]}
        </span>
      ) : null}
      <button
        type="button"
        className={css.chipRemove}
        aria-label="첨부 제거"
        onClick={() => onRemove(attachment.localId)}
      >
        <IconClose />
      </button>
    </span>
  );
}
