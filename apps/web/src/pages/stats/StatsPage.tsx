import { Eyebrow } from "../../components/ui/Eyebrow";
import { useCycleTimeStats } from "./hooks/useCycleTimeStats";
import { StatsBody } from "./sections/StatsBody";
import { StatsFilters } from "./sections/StatsFilters";
import * as shared from "../advice/adviceShared.css";

/**
 * 업무 통계 — 어느 단계에서 시간이 새는지 보는 화면(법무팀 전용).
 * 보는 화면이므로 등록·요청 버튼은 두지 않는다(요청은 각 메뉴에서).
 */
export const StatsPage = () => {
  const view = useCycleTimeStats();

  return (
    <div>
      <div className={shared.pageHead}>
        <div className={shared.pageTitleGroup}>
          <Eyebrow>개요</Eyebrow>
          <h1 className={shared.pageTitle}>업무 통계</h1>
        </div>
      </div>

      {view.canSee && <StatsFilters view={view} />}
      <StatsBody view={view} />
    </div>
  );
};
