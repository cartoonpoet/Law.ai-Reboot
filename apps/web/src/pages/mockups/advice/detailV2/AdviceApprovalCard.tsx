import { Avatar, Icon } from "@lawkit/ui";
import { APPROVER_TYPE_AVATAR, APPROVER_TYPE_LABEL } from "../../../contract/sections/approverMeta";
import * as modalCss from "../../../contract/sections/approvalLineModal.css";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetailV2.css";
import { APPROVERS, APPROVER_STATE_LABEL } from "./adviceDetailV2Data";

/** 결재선 — 계약 요청 폼 결재선 패널과 같은 Avatar + 이름/부서 + 유형 배지. */
export const AdviceApprovalCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="factCheck" size="sm" className={base.cheadIconMuted} />
      결재선
      <span className={base.cheadNote}>요청 합의 완료</span>
    </header>
    <div className={base.cbody}>
      <ol className={css.approverList}>
        {APPROVERS.map((approver) => (
          <li key={approver.id} className={approver.state === "wait" ? `${css.approverRow} ${css.approverDimmed}` : css.approverRow}>
            <Avatar initials={approver.name[0]} size="sm" color={APPROVER_TYPE_AVATAR[approver.type]} />
            <div className={css.approverMain}>
              <div className={css.approverName}>{approver.name}</div>
              <div className={css.approverDept}>{approver.dept}</div>
            </div>
            <div className={css.approverSide}>
              <span className={modalCss.typeBadge[approver.type]}>{APPROVER_TYPE_LABEL[approver.type]}</span>
              <span className={css.approverState[approver.state]}>
                {approver.state === "done" ? `${approver.decidedAt} ${APPROVER_STATE_LABEL.done}` : APPROVER_STATE_LABEL[approver.state]}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
