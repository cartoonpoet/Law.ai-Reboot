import { useState } from "react";
import { Avatar, Button, Card, Icon } from "@lawkit/ui";
import type { Approver } from "../../contract/request-schema";
import { ApprovalLineModal } from "../../contract/sections/ApprovalLineModal";
import { APPROVER_TYPE_AVATAR, APPROVER_TYPE_LABEL } from "../../contract/sections/approverMeta";
import * as appr from "../../contract/sections/approvalLineModal.css";
import * as css from "../../contract/contractRequest.css";

// 시안 기본 결재선 — 계약 요청 폼과 같은 형태(기안 → 결재).
const DEFAULT_APPROVERS: Approver[] = [
  { userId: "u-draft", name: "손준호", dept: "개발팀", type: "draft" },
  { userId: "u-legal", name: "김법무", dept: "법무팀", type: "approve" },
];

const approvalHeader = (
  <span className={css.railHead}>
    <Icon name="factCheck" size="sm" className={css.railHeadIcon} />
    결재선
  </span>
);

const aiHeader = (
  <span className={css.railHead}>
    <Icon name="autoAwesome" size="sm" className={css.railHeadIcon} />
    AI 사전 확인
  </span>
);

/** 자문 요청 우측 레일 — 결재선(계약 요청 폼과 동일한 패널·모달)과 AI 안내. */
export function AdviceRail() {
  const [approvers, setApprovers] = useState<Approver[]>(DEFAULT_APPROVERS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={css.rail}>
      <Card bordered header={approvalHeader}>
        <div className={css.apprList}>
          {approvers.map((approver, index) => (
            <div key={`${approver.name}-${index}`} className={css.apprRow}>
              <Avatar size="sm" color={APPROVER_TYPE_AVATAR[approver.type]} initials={approver.name[0]} />
              <div className={css.apprMain}>
                <div className={css.apprName}>{approver.name}</div>
                <div className={css.apprDept}>{approver.dept}</div>
              </div>
              <span className={appr.typeBadge[approver.type]}>{APPROVER_TYPE_LABEL[approver.type]}</span>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            color="secondary"
            size="small"
            iconLeft={<Icon name="factCheck" size="sm" />}
            onClick={() => setIsModalOpen(true)}
          >
            결재선 설정
          </Button>
        </div>
      </Card>

      {isModalOpen && (
        <ApprovalLineModal
          initial={approvers}
          onClose={() => setIsModalOpen(false)}
          onApply={(next) => {
            setApprovers(next);
            setIsModalOpen(false);
          }}
        />
      )}

      <Card bordered header={aiHeader}>
        <p className={css.aiNotice}>
          비슷한 지난 자문 2건과 관련 사내 규정 1건이 있어요. 요청 전에 먼저 확인하면 답이 이미 있을 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
