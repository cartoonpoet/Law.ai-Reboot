import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { cx } from "../../contract/cx";
import { LifecycleRing } from "../../contract/sections/LifecycleRing";
import { AssignModal } from "../../contract/sections/AssignModal";
import { ContractDetailSkeleton } from "../../contract/sections/ContractDetailSkeleton";
import { ADVICE_STATUS_COLOR, ADVICE_STATUS_LABEL } from "../adviceMeta";
import { getAdviceProgress } from "../getAdviceProgress";
import { useAdviceDetail } from "../hooks/useAdviceDetail";
import { AdviceActionPanel } from "./AdviceActionPanel";
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
  const { advice, isLoading, assign, isAssigning, sendMessage, isSending, close, isClosing } = useAdviceDetail(id);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

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

  const handleAssign = (ownerId: string) =>
    assign(ownerId, { onSuccess: () => setIsAssignOpen(false) });

  const handleSend = (kind: Parameters<typeof sendMessage>[0]["kind"], body: string, onSent: () => void) =>
    sendMessage({ kind, body }, { onSuccess: onSent });

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
          <AdviceThreadCard advice={advice} isSending={isSending} onSend={handleSend} />
        </div>

        <div className={cx(base.stack, base.sticky)}>
          <AdviceActionPanel
            advice={advice}
            now={now}
            isAssigning={isAssigning}
            isClosing={isClosing}
            onAssignClick={() => setIsAssignOpen(true)}
            onClose={close}
          />
          <AdviceHistoryCard advice={advice} />
        </div>
      </div>

      {isAssignOpen && (
        <AssignModal onClose={() => setIsAssignOpen(false)} onAssign={handleAssign} isAssigning={isAssigning} />
      )}
    </div>
  );
};
