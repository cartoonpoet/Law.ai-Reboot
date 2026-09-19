import { ProgressBar, Widget } from "@lawkit/ui";
import type { CycleTimeStage } from "@lawai/contracts";
import { Badge } from "../../../components/ui/Badge";
import { buildStageBars, formatDays, getDaysTone, type StageBarTypes } from "../cycleTimeView";
import * as css from "../stats.css";

interface StageBarsProps {
  stages: CycleTimeStage[];
}

// 목표 안에 든 시간은 파란색, 넘긴 시간은 빨간색으로 이어 붙인다.
const getSegments = (bar: StageBarTypes) => [
  { value: bar.fillPercent, color: "primary" as const },
  ...(bar.overPercent > 0 ? [{ value: bar.overPercent, color: "danger" as const }] : []),
];

/** 단계별 평균 소요시간 — 어느 단계에서 시간이 새는지 보는 곳. */
export const StageBars = ({ stages }: StageBarsProps) => (
  <Widget
    title="단계별 평균 소요시간"
    extra={<span className={css.cheadNote}>막대는 그 단계를 끝낸 건의 평균 · 파란색은 목표 안, 빨간색은 초과</span>}
  >
    <div className={css.barList}>
      {buildStageBars(stages).map((bar) => (
        <div key={bar.status} className={css.barRow}>
          <div className={css.barName}>{bar.label}</div>
          <div className={css.barTrack}>
            {bar.avgDays === null ? (
              <span className={css.barNone}>이 단계를 지나간 건이 아직 없어요</span>
            ) : (
              <ProgressBar segments={getSegments(bar)} aria-label={`${bar.label} 평균 ${bar.avgDays}일`} />
            )}
          </div>
          <div className={css.barNums}>
            <span className={css.barAvg[getDaysTone(bar)]}>{formatDays(bar.avgDays)}</span>
            <span className={css.barTarget}>목표 {bar.targetDays}일</span>
          </div>
          <div className={css.barSide}>
            {bar.openCount > 0 && <span className={css.barSideText}>멈춰 있는 건 {bar.openCount}건</span>}
            {bar.overdueCount > 0 && (
              <Badge color="danger" size="sm">
                목표일 넘김 {bar.overdueCount}건
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  </Widget>
);
