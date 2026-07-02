import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Card, Avatar, Button, Icon } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { ApprovalLineModal } from "../sections/ApprovalLineModal";
import { APPROVER_TYPE_LABEL, APPROVER_TYPE_AVATAR } from "../sections/approverMeta";
import * as appr from "../sections/approvalLineModal.css";
import * as css from "../contractRequest.css";

export function ApprovalLinePanel() {
  const { control, setValue } = useFormContext<ContractRequestForm>();
  const approvers = useWatch({ control, name: "approvers" }) ?? [];
  const [open, setOpen] = useState(false);

  const header = (
    <span className={css.railHead}>
      <Icon name="factCheck" size="sm" className={css.railHeadIcon} />
      결재선
    </span>
  );

  return (
    <Card bordered header={header}>
      <div className={css.apprList}>
        {approvers.map((a, i) => (
          <div key={`${a.name}-${i}`} className={css.apprRow}>
            <Avatar size="sm" color={APPROVER_TYPE_AVATAR[a.type]} initials={a.name[0]} />
            <div className={css.apprMain}>
              <div className={css.apprName}>{a.name}</div>
              <div className={css.apprDept}>{a.dept}</div>
            </div>
            <span className={appr.typeBadge[a.type]}>{APPROVER_TYPE_LABEL[a.type]}</span>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          color="secondary"
          size="small"
          iconLeft={<Icon name="factCheck" size="sm" />}
          onClick={() => setOpen(true)}
        >
          결재선 설정
        </Button>
      </div>

      {open && (
        <ApprovalLineModal
          initial={approvers}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            setValue("approvers", next, { shouldDirty: true });
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}
