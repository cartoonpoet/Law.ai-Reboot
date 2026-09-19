import { Callout, EmptyState, Icon } from "@lawkit/ui";
import type { CycleTimeStatsResponse } from "@lawai/contracts";
import { formatRecordedSince } from "../cycleTimeRange";
import { getHeadline, isEmptyStats } from "../cycleTimeView";
import { CycleTimeSummary } from "./CycleTimeSummary";
import { MonthlyTrend } from "./MonthlyTrend";
import { StageBars } from "./StageBars";
import { OverdueTable } from "./OverdueTable";
import { OwnerTable } from "./OwnerTable";
import * as css from "../stats.css";

interface CycleTimeReportProps {
  stats: CycleTimeStatsResponse;
  /** 다른 조건으로 다시 불러오는 중 — 이전 숫자를 흐리게 보여준다 */
  isFetching: boolean;
}

// 숫자를 오해하지 않도록, 언제부터 쌓인 자료인지 항상 같이 밝힌다.
const getRecordedNote = (recordedSince: string | null): string => {
  const since = formatRecordedSince(recordedSince);
  return since
    ? `${since} 부터 기록된 자료입니다. 그 전에 지나간 단계는 계산에 넣지 않았어요.`
    : "상태가 바뀔 때마다 기록이 쌓입니다.";
};

/** 업무 통계 본문 — 요약 → 큰 숫자 → 단계별 → 월별 → 지연 → 담당자별. */
export const CycleTimeReport = ({ stats, isFetching }: CycleTimeReportProps) => {
  if (isEmptyStats(stats)) {
    return (
      <div className={css.emptyWrap}>
        <EmptyState
          icon={<Icon name="barChart" size="lg" />}
          title="아직 집계할 자료가 없습니다"
          description="계약·자문의 상태가 바뀌면 단계별 소요시간이 여기에 쌓입니다."
        />
      </div>
    );
  }

  const headline = getHeadline(stats);

  return (
    <div className={`${css.sections} ${isFetching ? css.refetching : ""}`} aria-busy={isFetching}>
      <Callout intent={headline.isWarning ? "warning" : "info"} title={headline.text}>
        {getRecordedNote(stats.recordedSince)}
      </Callout>

      <CycleTimeSummary stats={stats} />
      <StageBars stages={stats.stages} />
      <MonthlyTrend monthly={stats.monthly} targetDays={stats.total.targetDays} />
      <OverdueTable targetType={stats.targetType} rows={stats.overdue} />
      {stats.owners.length > 0 && <OwnerTable owners={stats.owners} />}
    </div>
  );
};
