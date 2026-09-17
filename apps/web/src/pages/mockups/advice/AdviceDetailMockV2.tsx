import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { cx } from "../../contract/cx";
import { LifecycleRing } from "../../contract/sections/LifecycleRing";
import * as base from "../../contract/contractDetail.css";
import { getAdviceProgress } from "./getAdviceProgress";
import { ADVICE_STATUS_COLOR, ADVICE_STATUS_LABEL } from "./advice-mock-data";
import { ADVICE, THREAD_MESSAGES } from "./detailV2/adviceDetailV2Data";
import { AdviceGlance } from "./detailV2/AdviceGlance";
import { AdviceAiCard } from "./detailV2/AdviceAiCard";
import { AdviceContentCard } from "./detailV2/AdviceContentCard";
import { AdviceThreadCard } from "./detailV2/AdviceThreadCard";
import { AdviceActionPanel } from "./detailV2/AdviceActionPanel";
import { AdviceApprovalCard } from "./detailV2/AdviceApprovalCard";
import { AdviceFilesCard } from "./detailV2/AdviceFilesCard";
import { AdviceHistoryCard } from "./detailV2/AdviceHistoryCard";
import * as css from "./adviceDetailV2.css";

const STATUS = "reviewing";

const PROGRESS = getAdviceProgress({
  status: STATUS,
  note: `${ADVICE.ownerName} 변호사 검토 중 · 요청자에게 추가 질의 1건 발송, 답변 대기`,
});

/** 법률자문 상세 v2 — 계약 상세와 같은 뼈대(백링크 → 히어로 → 요약줄 → 진행 게이지 → 본문/레일). */
export const AdviceDetailMockV2 = () => {
  const navigate = useNavigate();
  const lastMessage = THREAD_MESSAGES[THREAD_MESSAGES.length - 1];

  return (
    <div className={base.page}>
      <button type="button" className={base.backlink} onClick={() => navigate("/mockups/advice-list")}>
        <Icon name="chevronLeft" size="sm" className={base.backIcon} />
        법률자문 조회
      </button>

      <header className={base.hero}>
        <div>
          <div className={base.heroTitleRow}>
            {ADVICE.isSecure && <Icon name="lock" size="sm" className={base.lockIcon} />}
            <h1 className={base.heroTitle}>{ADVICE.title}</h1>
            <Badge color={ADVICE_STATUS_COLOR[STATUS]} size="md" dot>
              {ADVICE_STATUS_LABEL[STATUS]}
            </Badge>
          </div>
          <div className={base.hmeta}>
            <span className={base.hcode}>{ADVICE.code}</span>
            <span className={base.sep}>|</span>
            <span>{ADVICE.requestedAt} 접수</span>
            <span className={base.sep}>|</span>
            <span>최근 활동 {lastMessage.sentAt}</span>
          </div>
        </div>
        <div className={base.heroActions}>
          <Button
            variant="outline"
            color="secondary"
            size="medium"
            iconLeft={<Icon name="contractEdit" size="sm" className={css.icon14} />}
          >
            계약 검토로 전환
          </Button>
          <Button size="medium" iconLeft={<Icon name="edit" size="sm" className={css.icon14} />}>
            회신 작성
          </Button>
        </div>
      </header>

      <AdviceGlance />

      <LifecycleRing progress={PROGRESS} />

      <div className={base.railGrid}>
        <div className={base.stack}>
          <AdviceContentCard />
          <AdviceAiCard />
          <AdviceThreadCard />
        </div>

        <div className={cx(base.stack, base.sticky)}>
          <AdviceActionPanel />
          <AdviceApprovalCard />
          <AdviceFilesCard />
          <AdviceHistoryCard />
        </div>
      </div>
    </div>
  );
};
