import { useNavigate } from "react-router-dom";
import { Button, Icon, StatCell, StatGrid, Widget } from "@lawkit/ui";
import { formatDays } from "../stats/cycleTimeView";
import { useCycleTimeSummary } from "../stats/hooks/useCycleTimeSummary";
import * as css from "./dashboard.css";

const LOADING_TEXT = "–";

/**
 * 홈의 작은 소요시간 카드 — 계약 평균과 지연 건수만. 법무팀에게만 보인다(호출부에서 가린다).
 * 목표일·단계별 내용은 "자세히"로 들어가는 업무 통계 화면에서 본다(좁은 카드에 숫자를 겹쳐 넣지 않는다).
 */
export const CycleTimeCard = () => {
  const navigate = useNavigate();
  const summary = useCycleTimeSummary();

  const isSlow = summary.avgDays !== null && summary.targetDays !== null && summary.avgDays > summary.targetDays;
  const hasOverdue = summary.overdueCount !== null && summary.overdueCount > 0;

  return (
    <Widget
      title="계약 소요시간"
      extra={
        <Button
          variant="outline"
          color="secondary"
          size="small"
          iconRight={<Icon name="chevronRight" size="sm" className={css.cycleChevron} />}
          onClick={() => navigate("/stats")}
        >
          자세히
        </Button>
      }
    >
      <StatGrid>
        <StatCell
          label="접수 → 체결 평균 (최근 6개월)"
          value={summary.isLoading ? LOADING_TEXT : formatDays(summary.avgDays)}
          valueColor={isSlow ? "danger" : "heading"}
        />
        <StatCell
          label="목표일 넘긴 건"
          value={summary.isLoading ? LOADING_TEXT : `${summary.overdueCount ?? 0}건`}
          valueColor={hasOverdue ? "danger" : "heading"}
        />
      </StatGrid>
    </Widget>
  );
};
