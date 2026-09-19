import { StatCell, StatGrid, Widget } from "@lawkit/ui";
import type { CycleTimeStatsResponse } from "@lawai/contracts";
import { formatDays, getOverdueTotal, getTotalDelta } from "../cycleTimeView";
import * as css from "../stats.css";

interface CycleTimeSummaryProps {
  stats: CycleTimeStatsResponse;
}

/** 큰 숫자 줄 — 전체 평균 · 목표 대비 · 끝난 건 · 지연 건. */
export const CycleTimeSummary = ({ stats }: CycleTimeSummaryProps) => {
  const delta = getTotalDelta(stats.total);
  const overdueCount = getOverdueTotal(stats.stages);

  return (
    <Widget
      title={`${stats.total.label} 소요시간`}
      extra={<span className={css.cheadNote}>중간값 {formatDays(stats.total.medianDays)}</span>}
    >
      <StatGrid>
        <StatCell
          label="전체 평균"
          value={formatDays(stats.total.avgDays)}
          valueColor={delta.isOver ? "danger" : "heading"}
          active
        />
        <StatCell
          label={`목표 ${stats.total.targetDays}일 대비`}
          value={delta.text}
          valueColor={delta.isOver ? "danger" : "success"}
        />
        <StatCell label="끝난 건" value={`${stats.total.doneCount}건`} valueColor="heading" />
        <StatCell
          label="목표일 넘긴 건"
          value={`${overdueCount}건`}
          valueColor={overdueCount > 0 ? "danger" : "heading"}
        />
      </StatGrid>
    </Widget>
  );
};
