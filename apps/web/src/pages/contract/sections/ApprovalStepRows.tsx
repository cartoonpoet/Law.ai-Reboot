import type { ReactNode } from "react";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import type { ApprovalStepView } from "../mock-data";
import { cx } from "../cx";
import * as css from "../contractDetail.css";

interface ApprovalStepRowsProps {
  steps: ApprovalStepView[];
  // 현재 차례(statusKind="now") 단계 행 바로 아래에 끼워 넣을 내용(예: 결재 의견 + 승인/반려 박스).
  currentStepExtra: ReactNode;
}

/** 결재선 단계 행 목록 — 상세 결재선 카드와 검토 액션 패널의 결재 현황이 함께 쓴다. */
export const ApprovalStepRows = ({ steps, currentStepExtra }: ApprovalStepRowsProps) => (
  <>
    {steps.map((step) => (
      <div key={step.id}>
        <div className={css.apvrow}>
          <span
            className={cx(
              css.apvnum,
              step.statusKind === "done" && css.apvnumDone,
              step.statusKind === "rejected" && css.apvnumRejected,
              step.statusKind === "now" && css.apvnumActive,
            )}
          >
            {step.statusKind === "done" ? "✓" : step.order + 1}
          </span>
          <UserAvatar name={step.name} avatarUrl={step.avatarUrl} size="small" isDecorative />
          <span>
            <span className={css.apvname}>{step.name}</span>
            <span className={css.apvdept}>{step.dept}</span>
          </span>
          <span className={cx(css.apvtype, css.apvtypeKind[step.typeKind])}>{step.type}</span>
          <span className={cx(css.apvstat, css.apvstatKind[step.statusKind])}>{step.status}</span>
        </div>
        {step.comment && <p className={css.apvcomment}>{step.comment}</p>}
        {step.statusKind === "now" && currentStepExtra}
      </div>
    ))}
  </>
);
