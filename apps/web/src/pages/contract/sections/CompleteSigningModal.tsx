import { useState } from "react";
import { Modal, Button, Alert, FileUploadArea, FileItem, InputDatePicker } from "@lawkit/ui";
import { useCompleteSigning } from "../hooks/useCompleteSigning";
import { useFileUpload } from "../hooks/useFileUpload";
import { toISODate, isoToDate } from "../dateIso";
import { formatBytes } from "../utils/formatBytes";
import * as css from "./completeSigningModal.css";

interface CompleteSigningModalProps {
  contractId: string;
  onClose: () => void;
}

/**
 * 체결 처리 모달(시안 탭3 #signModal) — 최종 서명본 업로드(기존 useFileUpload 재사용) + 체결일 + 비고.
 *
 * 기존 파일(계약서 등) 중 하나를 고르게 하지 않고 항상 새로 업로드한 파일만 서명본으로 지정한다.
 * 검토본(role="contract")을 그대로 승격하면 계약의 유일한 계약서 파일이 사라져, 결재 라인이
 * 있는 계약을 다시 열었을 때(검토 모드) 편집 화면이 영구히 저장 불가능해지기 때문이다
 * (서버 completeSigning 도 동일하게 role="contract" 파일의 승격을 거부한다 — 이중 방어).
 */
export function CompleteSigningModal({ contractId, onClose }: CompleteSigningModalProps) {
  const upload = useFileUpload({ contractId });
  const { submit, isPending, error } = useCompleteSigning(contractId);
  const [signedAt, setSignedAt] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState("");

  // 서명본은 한 건만 의미가 있다 — 여러 개를 첨부해도 첫 번째로 업로드 완료된 파일을 지정한다.
  const fileId = upload.getReadyIds()[0] ?? null;
  const canConfirm = Boolean(signedAt) && Boolean(fileId) && !upload.hasPending && !isPending;

  const handleConfirm = () => {
    if (!fileId) return;
    submit({ signedAt, fileId, note: note.trim() || null }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="체결 처리"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            color="success"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            체결 확정
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <Alert type="info" size="small">
          확정하면 계약이 <b>체결 완료</b> 상태가 되고 더 이상 수정할 수 없습니다.
        </Alert>

        <div>
          <div className={css.fieldLabel}>
            최종 서명본<span className={css.required}>*</span>
          </div>
          <FileUploadArea
            variant="basic"
            description="서명·날인이 완료된 계약서 원본"
            onFilesAdded={upload.addFiles}
          >
            {upload.attachments.length > 0 && (
              <div className={css.fileList}>
                {upload.attachments.map((a) => (
                  <FileItem
                    key={a.localId}
                    filename={a.name}
                    fileMeta={
                      a.status === "error"
                        ? (a.reason ?? "업로드 실패")
                        : a.status === "done"
                          ? formatBytes(a.size)
                          : "업로드 중…"
                    }
                    onDelete={() => upload.removeAttachment(a.localId)}
                  />
                ))}
              </div>
            )}
          </FileUploadArea>
        </div>

        <div>
          <div className={css.fieldLabel}>
            체결일<span className={css.required}>*</span>
          </div>
          <InputDatePicker
            value={isoToDate(signedAt)}
            placeholder="YYYY-MM-DD"
            onChange={(d) => setSignedAt(toISODate(d))}
          />
        </div>

        <div>
          <div className={css.fieldLabel}>비고</div>
          <textarea
            className={css.textarea}
            rows={2}
            placeholder="특이사항이 있으면 입력하세요 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className={css.error}>{error}</p>}
      </div>
    </Modal>
  );
}
