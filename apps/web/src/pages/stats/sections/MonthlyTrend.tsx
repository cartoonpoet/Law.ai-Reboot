import { ProgressBar, Widget } from "@lawkit/ui";
import type { CycleTimeStatsResponse } from "@lawai/contracts";
import { buildMonthlyBars, formatDays, getDaysTone } from "../cycleTimeView";
import * as css from "../stats.css";

interface MonthlyTrendProps {
  monthly: CycleTimeStatsResponse["monthly"];
  targetDays: number;
}

/** 월별 추이 — 그 달에 끝난 건의 평균. 목표를 넘긴 달은 빨간 막대. */
export const MonthlyTrend = ({ monthly, targetDays }: MonthlyTrendProps) => {
  const bars = buildMonthlyBars(monthly, targetDays);

  return (
    <Widget
      title="월별 추이"
      extra={<span className={css.cheadNote}>그 달에 끝난 건 기준 · 목표 {targetDays}일</span>}
    >
      <div className={css.barList}>
        {bars.length === 0 ? (
          <span className={css.barNone}>아직 끝난 건이 없어 추이를 그릴 수 없어요</span>
        ) : (
          bars.map((bar) => (
            <div key={bar.month} className={css.monthRow}>
              <div className={css.monthName}>{bar.label}</div>
              <div className={css.barTrack}>
                <ProgressBar
                  value={bar.percent}
                  color={bar.isOver ? "danger" : "primary"}
                  aria-label={`${bar.label} 평균 ${formatDays(bar.avgDays)}`}
                />
              </div>
              <div className={css.barNums}>
                <span className={css.barAvg[getDaysTone(bar)]}>{formatDays(bar.avgDays)}</span>
                <span className={css.monthDone}>끝난 건 {bar.doneCount}건</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Widget>
  );
};
