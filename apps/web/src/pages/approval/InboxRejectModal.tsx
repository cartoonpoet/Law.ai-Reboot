import { useState } from "react";
import { Button, Modal, Textarea, VStack } from "@lawkit/ui";
import * as css from "./approvalInbox.css";

interface InboxRejectModalProps {
  title: string;
  isRejecting: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}

/** 반려 확인 — 사유는 선택이지만, 상신자가 무엇을 고쳐야 할지 알 수 있게 적기를 권한다. */
export const InboxRejectModal = ({ title, isRejecting, onClose, onConfirm }: InboxRejectModalProps) => {
  const [comment, setComment] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      size="small"
      title="이 결재를 반려할까요?"
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button color="danger" disabled={isRejecting} onClick={() => onConfirm(comment)}>
            반려
          </Button>
        </>
      }
    >
      <VStack gap="x3">
        <p className={css.modalDoc}>{title}</p>
        <Textarea
          textareaSize="small"
          rows={3}
          resize="none"
          placeholder="반려 사유 (선택) — 상신자에게 그대로 전달됩니다"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </VStack>
    </Modal>
  );
};
