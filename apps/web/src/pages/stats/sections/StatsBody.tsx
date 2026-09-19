import { Button, EmptyState, Icon } from "@lawkit/ui";
import type { CycleTimeViewTypes } from "../hooks/useCycleTimeStats";
import { CycleTimeReport } from "./CycleTimeReport";
import { StatsSkeleton } from "./StatsSkeleton";
import * as css from "../stats.css";

interface StatsBodyProps {
  view: CycleTimeViewTypes;
}

/**
 * 권한 확인 → 불러오는 중 → 본문.
 * 못 불러온 것과 아직 불러오는 중인 것을 갈라서, 어느 경우에도 스켈레톤에 갇히지 않게 한다.
 */
export const StatsBody = ({ view }: StatsBodyProps) => {
  if (view.isPermissionLoading) return <StatsSkeleton />;

  // 내 권한을 못 불러왔을 때. "볼 수 없다"고 단정하지 않고 다시 시도할 길을 준다.
  if (view.isPermissionError) {
    return (
      <div className={css.emptyWrap}>
        <EmptyState
          icon={<Icon name="alertTriangle" size="lg" />}
          title="권한을 확인하지 못했습니다"
          description="잠시 후 다시 시도해 주세요. 계속 이러면 화면을 새로고침해 주세요."
        />
      </div>
    );
  }

  if (!view.canSee) {
    return (
      <div className={css.emptyWrap}>
        <EmptyState
          icon={<Icon name="lock" size="lg" />}
          title="업무 통계는 법무팀만 볼 수 있습니다"
          description="계약·자문의 단계별 소요시간은 법무팀(사내변호사)에게만 보입니다. 필요하시면 법무팀에 문의해 주세요."
        />
      </div>
    );
  }

  // 보여줄 숫자가 하나도 없는 채로 실패했을 때만 오류 화면. 이전 숫자가 남아 있으면 그대로 두고 아래 본문을 그린다.
  if (view.isError && view.stats === null) {
    return (
      <div className={css.emptyWrap}>
        <EmptyState
          icon={<Icon name="alertTriangle" size="lg" />}
          title="통계를 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          action={<Button onClick={view.retry}>다시 시도</Button>}
        />
      </div>
    );
  }

  if (view.stats === null) return <StatsSkeleton />;

  return <CycleTimeReport stats={view.stats} isFetching={view.isFetching} />;
};
