import { useState } from "react";
import { Modal, Button, Icon } from "@lawkit/ui";
import * as css from "./approvalRejectModal.css";

interface ApprovalRejectModalProps {
  onClose: () => void;
  onConfirm: (comment: string) => void;
  isRejecting?: boolean;
}

/** 체결 품의 반려 확인 모달 — 사유(선택) 입력 후 확정. 반려 시 계약이 검토 완료로 복귀함을 안내. */
export function ApprovalRejectModal({ onClose, onConfirm, isRejecting }: ApprovalRejectModalProps) {
  const [comment, setComment] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="체결 품의 반려"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" color="danger" onClick={() => onConfirm(comment)} disabled={isRejecting}>
            반려 확정
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        반려 사유를 입력해 주세요. 사유는 결재 이력과 상신자 알림에 표시됩니다.
        <textarea
          className={css.textarea}
          placeholder="예) 계약 금액이 승인 예산을 초과합니다. 조정 후 재상신 바랍니다."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className={css.warn}>
          <Icon name="alertTriangle" size="sm" className={css.warnIcon} />
          <span>
            반려하면 결재가 종료되고 계약이 <b>검토 완료</b> 상태로 복귀합니다. 요청자는 결재선을 수정해
            다시 상신할 수 있습니다.
          </span>
        </div>
      </div>
    </Modal>
  );
}
