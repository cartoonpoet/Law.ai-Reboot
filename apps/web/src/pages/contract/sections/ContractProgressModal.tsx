import { Modal, Button, Alert } from "@lawkit/ui";
import * as css from "./completeSigningModal.css";

export type ContractProgressTargetTypes = "fulfilling" | "closed";

interface ContractProgressModalProps {
  target: ContractProgressTargetTypes;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const COPY: Record<ContractProgressTargetTypes, { title: string; confirm: string; description: string }> = {
  fulfilling: {
    title: "이행 시작",
    confirm: "이행 시작",
    description: "계약을 '계약 이행' 단계로 넘깁니다. 체결 완료 단계로는 되돌릴 수 없어요.",
  },
  closed: {
    title: "계약 종료",
    confirm: "종료",
    description: "계약을 '계약 종료' 단계로 넘깁니다. 종료한 계약은 다시 진행할 수 없어요.",
  },
};

// 체결 이후 단계 전이 확인 — 되돌릴 수 없는 전이라 한 번 더 묻는다.
export const ContractProgressModal = ({ target, isPending, onConfirm, onClose }: ContractProgressModalProps) => {
  const copy = COPY[target];
  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title={copy.title}
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? "처리 중…" : copy.confirm}
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <Alert type="info" size="small">
          {copy.description}
        </Alert>
      </div>
    </Modal>
  );
};
