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
 *
 * 파일은 정확히 한 건만 받고, 업로드가 실패(error)하지 않는 한 제거를 제공하지 않는다 — 리뷰에서
 * 짚힌 문제: files.service 의 confirm 은 presign→PUT 이 끝난 뒤 곧바로(=uploading 상태로 표시되는
 * 동안) File 행(role=attach)을 만들고, useFileUpload 에는 그 진행 중인 요청을 취소할 수단
 * (AbortController 등)이 없다. 즉 "pending/uploading 이면 서버에 아직 행이 없다"는 보장이 없다
 * — uploading 중에 제거해도 그 사이 confirm 이 이미 성공해 행이 생겼을 수 있고, 로컬 상태만
 * 지워질 뿐이라 드롭존이 다시 열려 두 번째 파일을 올리면 첫 파일이 고아로 영구히 남는다. 오직
 * error 상태만 confirm 이 끝내 성공하지 못했음이 확정된 상태라 안전하게 제거할 수 있다. (한 번
 * 진짜로 멈춰버린(reject 도 resolve 도 안 하는) 요청은 이 훅 구조상 새로고침 없이는 취소할
 * 수 없다는 트레이드오프가 남지만, 실패는 전부 error 로 귀결되므로 실제로 걸리는 경우는 진짜
 * 행이 멎는 극단적 상황뿐이다 — useFileUpload.ts 는 코멘트 첨부와 공유하므로 여기서 고치지
 * 않는다.)
 */
export const CompleteSigningModal = ({ contractId, onClose }: CompleteSigningModalProps) => {
  const upload = useFileUpload({ contractId });
  const { submit, isPending, error } = useCompleteSigning(contractId);
  const [signedAt, setSignedAt] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState("");
  const [hasExtraFiles, setHasExtraFiles] = useState(false);

  // 정확히 한 건만 다룬다 — 드롭존은 파일이 하나라도 있으면 사라지므로 구조적으로 1개를 넘지 않는다.
  const attachment = upload.attachments[0] ?? null;
  const canRemove = attachment?.status === "error";
  const fileId = attachment?.status === "done" ? (attachment.attachment?.id ?? null) : null;
  const canConfirm = Boolean(signedAt) && Boolean(fileId) && !isPending;

  const handleAddFiles = (files: File[]) => {
    // 한 건 초과분은 애초에 받지 않는다(다중 업로드가 남기는 고아 첨부 방지) — 대신 잘렸다는
    // 사실을 사용자에게 알린다(조용히 버리지 않는다).
    setHasExtraFiles(files.length > 1);
    void upload.addFiles(files.slice(0, 1));
  };

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
          {!attachment && (
            <>
              <p className={css.uploadNotice}>
                업로드한 파일은 계약에 영구히 첨부됩니다. 업로드 전에 파일을 다시 확인하세요.
              </p>
              <FileUploadArea
                variant="basic"
                description="서명·날인이 완료된 계약서 원본"
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
};
