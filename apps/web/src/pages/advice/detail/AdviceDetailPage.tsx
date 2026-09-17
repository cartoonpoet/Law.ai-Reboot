import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { cx } from "../../contract/cx";
import { LifecycleRing } from "../../contract/sections/LifecycleRing";
import { AssignModal } from "../../contract/sections/AssignModal";
import { ApprovalLineModal } from "../../contract/sections/ApprovalLineModal";
import { useMe } from "../../../components/layout/hooks/useMe";
import { createDraftApprover } from "../approval/adviceApprovers";
import { ContractDetailSkeleton } from "../../contract/sections/ContractDetailSkeleton";
import { ADVICE_STATUS_COLOR, ADVICE_STATUS_LABEL } from "../adviceMeta";
import { getAdviceProgress } from "../getAdviceProgress";
import { useAdviceDetail, type AdviceMessageInput } from "../hooks/useAdviceDetail";
import { AdviceActionPanel } from "./AdviceActionPanel";
import { AdviceApprovalCard } from "./AdviceApprovalCard";
import { AdviceContentCard } from "./AdviceContentCard";
import { AdviceGlance } from "./AdviceGlance";
import { AdviceHistoryCard } from "./AdviceHistoryCard";
import { AdviceThreadCard } from "./AdviceThreadCard";
import { formatShortDateTime } from "./toAdviceHistory";
import * as base from "../../contract/contractDetail.css";

/** 법률자문 상세 — 계약 상세와 같은 뼈대(백링크 → 히어로 → 요약줄 → 진행 게이지 → 본문/레일). */
export const AdviceDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const detail = useAdviceDetail(id);
  const { advice, isLoading } = detail;
  const { me } = useMe();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);

  // 상세 로딩은 같은 뼈대의 스켈레톤(계약 상세와 동일).
  if (isLoading) return <ContractDetailSkeleton />;

  if (!advice) {
    return (
      <div className={base.page}>
        <div className={base.empty}>자문을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const now = new Date();
  const lastActivityAt = advice.messages.at(-1)?.createdAt ?? advice.createdAt;

  const draftApprover = me ? createDraftApprover(me) : null;
  // 다시 올릴 때는 반려된 결재선을 그대로 불러와 고친다.
  const rejectedRequestApprovers = (advice.requestApproval?.steps ?? []).map((step) => ({
    userId: step.userId,
    name: step.name,
    dept: step.dept,
    type: step.type,
  }));

  const handleAssign = (ownerId: string) =>
    detail.assign(ownerId, { onSuccess: () => setIsAssignOpen(false) });

  const handleSend = (message: AdviceMessageInput, onSent: () => void) =>
    detail.sendMessage(message, { onSuccess: onSent });

  const handleDecide = (lineId: string, decision: "approve" | "reject", comment: string) =>
    detail.decide({ lineId, decision, comment });

  return (
    <div className={base.page}>
      <button type="button" className={base.backlink} onClick={() => navigate("/advice")}>
        <Icon name="chevronLeft" size="sm" className={base.backIcon} />
        법률자문 조회
      </button>

      <header className={base.hero}>
        <div>
          <div className={base.heroTitleRow}>
            {advice.securityLevel !== "normal" && <Icon name="lock" size="sm" className={base.lockIcon} />}
            <h1 className={base.heroTitle}>{advice.title}</h1>
            <Badge color={ADVICE_STATUS_COLOR[advice.status]} size="md" dot>
              {ADVICE_STATUS_LABEL[advice.status]}
            </Badge>
          </div>
          <div className={base.hmeta}>
            <span className={base.hcode}>{advice.code}</span>
            <span className={base.sep}>|</span>
            <span>{advice.createdAt.slice(0, 10)} 접수</span>
            <span className={base.sep}>|</span>
            <span>최근 활동 {formatShortDateTime(lastActivityAt)}</span>
          </div>
        </div>
      </header>

      <AdviceGlance advice={advice} />

      <LifecycleRing progress={getAdviceProgress(advice, now)} />

      <div className={base.railGrid}>
        <div className={base.stack}>
          <AdviceContentCard advice={advice} />
          <AdviceThreadCard
            advice={advice}
            draftApprover={draftApprover}
            isSending={detail.isSending}
            onSend={handleSend}
          />
        </div>

        <div className={cx(base.stack, base.sticky)}>
          <AdviceActionPanel
            advice={advice}
            now={now}
            isAssigning={detail.isAssigning}
            isClosing={detail.isClosing}
            isResubmitting={detail.isResubmitting}
            onAssignClick={() => setIsAssignOpen(true)}
            onClose={detail.close}
            onResubmitClick={() => setIsResubmitOpen(true)}
          />
          <AdviceApprovalCard
            advice={advice}
            viewerId={me?.id ?? null}
            isDeciding={detail.isDeciding}
            onDecide={handleDecide}
          />
          <AdviceHistoryCard advice={advice} />
        </div>
      </div>

      {isAssignOpen && (
        <AssignModal onClose={() => setIsAssignOpen(false)} onAssign={handleAssign} isAssigning={detail.isAssigning} />
      )}

      {isResubmitOpen && (
        <ApprovalLineModal
          initial={rejectedRequestApprovers}
          onClose={() => setIsResubmitOpen(false)}
          onApply={(approvers) => {
            setIsResubmitOpen(false);
            detail.resubmitRequestApproval(approvers);
          }}
        />
      )}
    </div>
  );
};
