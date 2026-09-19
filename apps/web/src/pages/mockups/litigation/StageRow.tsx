import { STAGE_LABEL, type CaseStageTypes } from "./litigationMockData";
import * as css from "./litigationMock.css";

const STAGES: CaseStageTypes[] = ["first", "appeal", "final"];

const getStepClass = (stage: CaseStageTypes, current: CaseStageTypes): string => {
  const order = STAGES.indexOf(stage);
  const currentOrder = STAGES.indexOf(current);
  if (order < currentOrder) return `${css.stageStep} ${css.stageStepDone}`;
  if (order === currentOrder) return `${css.stageStep} ${css.stageStepActive}`;
  return css.stageStep;
};

/** 심급 진행 — 지난 심급은 회색, 지금 심급은 파란색. */
export const StageRow = ({ current }: { current: CaseStageTypes }) => (
  <div className={css.stageRow}>
    {STAGES.map((stage, index) => (
      <span key={stage} className={css.stageRow}>
        {index > 0 && <span className={css.stageArrow}>›</span>}
        <span className={getStepClass(stage, current)}>{STAGE_LABEL[stage]}</span>
      </span>
    ))}
  </div>
);
