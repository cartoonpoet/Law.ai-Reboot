import { Modal, Button, Alert } from "@lawkit/ui";
import type { ContractSummary } from "@lawai/contracts";
import * as css from "../sections/completeSigningModal.css";

interface ExpireContractModalProps {
  contract: ContractSummary;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// 만료로 종료 확인 — 되돌릴 수 없는 전이라 한 번 더 묻는다.
export const ExpireContractModal = ({ contract, isPending, onConfirm, onClose }: ExpireContractModalProps) => (
  <Modal
    open
    onClose={onClose}
    size="medium"
    title="만료로 종료"
    footer={
      <div className={css.footRow}>
        <Button type="button" variant="outline" color="secondary" onClick={onClose}>
          취소
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? "처리 중…" : "만료로 종료"}
        </Button>
      </div>
    }
  >
    <div className={css.body}>
      <Alert type="info" size="small">
        <b>{contract.title}</b>({contract.code}) 계약을 <b>계약 종료(기간 만료)</b>로 바꿉니다. 종료한 계약은 다시 진행할 수 없어요.
      </Alert>
    </div>
  </Modal>
);
