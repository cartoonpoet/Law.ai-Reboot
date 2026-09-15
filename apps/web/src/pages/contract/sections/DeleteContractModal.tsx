import { Modal, Button, Alert } from "@lawkit/ui";
import { useDeleteContract } from "../hooks/useDeleteContract";
import * as css from "./completeSigningModal.css";

interface DeleteContractModalProps {
  contractId: string;
  contractName: string;
  onClose: () => void;
}

// 계약 삭제 확인 — 삭제하면 목록·검색·대시보드에서 사라지고, 파일과 변경 기록은 서버에 보존된다.
export const DeleteContractModal = ({ contractId, contractName, onClose }: DeleteContractModalProps) => {
  const { remove, isPending, error } = useDeleteContract(contractId);

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="계약 삭제"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" color="danger" onClick={remove} disabled={isPending}>
            {isPending ? "삭제 중…" : "삭제"}
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <Alert type="info" size="small">
          <b>{contractName}</b> 계약을 삭제합니다. 목록·검색·대시보드에서 사라지며, 첨부 파일과 변경 기록은 보존됩니다. 잘못 지웠다면 시스템 관리자가 복구할 수 있어요.
        </Alert>
        {error && <p className={css.error}>{error}</p>}
      </div>
    </Modal>
  );
};
