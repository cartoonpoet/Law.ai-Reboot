import { Avatar } from "@lawkit/ui";
import type { Approver } from "../../contract/request-schema";
import { APPROVER_TYPE_AVATAR, APPROVER_TYPE_LABEL } from "../../contract/sections/approverMeta";
import * as appr from "../../contract/sections/approvalLineModal.css";
import * as formCss from "../../contract/contractRequest.css";

/** 올리기 전 결재선 — 계약 요청 폼 우측 레일과 같은 Avatar + 이름/부서 + 유형 배지. */
export const ApproverRows = ({ approvers }: { approvers: Approver[] }) => (
  <>
    {approvers.map((approver, index) => (
      <div key={`${approver.userId ?? approver.name}-${index}`} className={formCss.apprRow}>
        <Avatar size="sm" color={APPROVER_TYPE_AVATAR[approver.type]} initials={approver.name[0]} />
        <div className={formCss.apprMain}>
          <div className={formCss.apprName}>{approver.name}</div>
          <div className={formCss.apprDept}>{approver.dept}</div>
        </div>
        <span className={appr.typeBadge[approver.type]}>{APPROVER_TYPE_LABEL[approver.type]}</span>
      </div>
    ))}
  </>
);
