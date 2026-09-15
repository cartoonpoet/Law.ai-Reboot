import { useState } from "react";
import { Modal, Button, Alert, FileUploadArea, FileItem, InputDatePicker, Radio, RadioGroup } from "@lawkit/ui";
import type { TerminationReason } from "@lawai/contracts";
import { useTerminateContract } from "../hooks/useTerminateContract";
import { useFileUpload } from "../hooks/useFileUpload";
import { toISODate, isoToDate } from "../dateIso";
import { formatBytes } from "../utils/formatBytes";
import * as css from "./completeSigningModal.css";

interface TerminateContractModalProps {
  contractId: string;
  // 서명된 해지 서류가 아직 없을 때 — 해지 합의서를 법무 검토받는 요청 폼으로 보낸다.
  onRequestReview: () => void;
  onClose: () => void;
}

const REASON_OPTIONS: { value: TerminationReason; label: string }[] = [
  { value: "agreement", label: "합의 해지" },
  { value: "counterpartyBreach", label: "상대방 귀책" },
  { value: "ourCircumstance", label: "당사 사정" },
  { value: "other", label: "기타" },
];

/**
 * 중도 해지 모달 — 해지일·사유·해지 합의서(통지서) 한 건·메모.
 * 파일은 체결 처리·서명본 교체 모달과 같은 이유로 한 건만, 업로드가 실패(error)한 경우에만 제거를 허용한다.
 */
export const TerminateContractModal = ({ contractId, onRequestReview, onClose }: TerminateContractModalProps) => {
  const upload = useFileUpload({ contractId });
  const { submit, isPending, error } = useTerminateContract(contractId);
  const [terminatedOn, setTerminatedOn] = useState(() => toISODate(new Date()));
  const [reason, setReason] = useState<TerminationReason | null>(null);
  const [note, setNote] = useState("");
  const [hasExtraFiles, setHasExtraFiles] = useState(false);

  const attachment = upload.attachments[0] ?? null;
  const canRemove = attachment?.status === "error";
  const fileId = attachment?.status === "done" ? (attachment.attachment?.id ?? null) : null;
  const canConfirm = Boolean(terminatedOn) && reason !== null && Boolean(fileId) && !isPending;

  const handleAddFiles = (files: File[]) => {
    setHasExtraFiles(files.length > 1);
    void upload.addFiles(files.slice(0, 1));
  };

  const handleConfirm = () => {
    if (!fileId || !reason) return;
    submit({ terminatedOn, reason, note: note.trim() || undefined, fileId }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="중도 해지"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" color="danger" onClick={handleConfirm} disabled={!canConfirm}>
            {isPending ? "처리 중…" : "해지 확정"}
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <Alert type="info" size="small">
          해지하면 계약이 <b>계약 종료(중도 해지)</b>로 바뀌고 되돌릴 수 없어요. 해지일은 계약의 실제 종료일로 남아요.
        </Alert>

        <div className={css.footRow}>
          <p className={css.uploadNotice}>서명된 해지 서류가 아직 없나요? 해지 합의서를 먼저 법무 검토받을 수 있어요.</p>
          <Button type="button" size="small" variant="outline" color="secondary" onClick={onRequestReview}>
            해지 합의서 검토 요청
          </Button>
        </div>

        <div>
          <div className={css.fieldLabel}>
            해지일<span className={css.required}>*</span>
          </div>
          <InputDatePicker
            value={isoToDate(terminatedOn)}
            placeholder="YYYY-MM-DD"
            onChange={(d) => setTerminatedOn(toISODate(d))}
          />
        </div>

        <div>
          <div className={css.fieldLabel}>
            해지 사유<span className={css.required}>*</span>
          </div>
          <RadioGroup value={reason ?? ""} onChange={(value) => setReason(value as TerminationReason)}>
            {REASON_OPTIONS.map((option) => (
              <Radio key={option.value} value={option.value} label={option.label} />
            ))}
          </RadioGroup>
        </div>

        <div>
          <div className={css.fieldLabel}>
            해지 합의서·통지서<span className={css.required}>*</span>
          </div>
          {!attachment && (
            <>
              <p className={css.uploadNotice}>
                업로드한 파일은 계약에 영구히 첨부됩니다. 업로드 전에 파일을 다시 확인하세요.
              </p>
              <FileUploadArea
                variant="basic"
                description="상대방과 서명한 해지 합의서 또는 보낸 해지 통지서"
                onFilesAdded={handleAddFiles}
              />
            </>
          )}
          {hasExtraFiles && (
            <p className={css.warnNotice}>해지 서류는 한 건만 첨부할 수 있어 첫 번째 파일만 사용했습니다.</p>
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
                onDelete={canRemove ? () => upload.removeAttachment(attachment.localId) : undefined}
              />
            </div>
          )}
        </div>

        <div>
          <div className={css.fieldLabel}>메모</div>
          <textarea
            className={css.textarea}
            rows={2}
            maxLength={500}
            placeholder="해지 경위를 남겨 두세요 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className={css.error}>{error}</p>}
      </div>
    </Modal>
  );
};
