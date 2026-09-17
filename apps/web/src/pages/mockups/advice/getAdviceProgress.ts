import type { LifecycleProgress, LifecycleStepStateTypes } from "../../contract/getLifecycleProgress";
import type { AdviceStatusTypes } from "./advice-mock-data";

/**
 * 자문 상태 → 계약 상세와 같은 진행 게이지(LifecycleRing) 뷰모델.
 * 단계: 접수(자문 요청·담당 배정) → 검토(법무 검토·추가 질의) → 회신(회신 완료·종결)
 */
const ADVICE_PHASES = [
  { name: "접수", labels: ["자문 요청", "담당 배정"] },
  { name: "검토", labels: ["법무 검토", "추가 질의"] },
  { name: "회신", labels: ["회신 완료", "종결"] },
] as const;

const STEPS = ADVICE_PHASES.flatMap((phase) => phase.labels.map((label) => ({ label, phase: phase.name })));
const LAST_INDEX = STEPS.length - 1;

const STATUS_TO_INDEX: Record<AdviceStatusTypes, number> = {
  received: 1,
  reviewing: 2,
  answered: 4,
  closed: 5,
};

const getStepState = (index: number, currentIndex: number): LifecycleStepStateTypes => {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
};

export interface AdviceProgressInput {
  status: AdviceStatusTypes;
  note: string;
}

export const getAdviceProgress = ({ status, note }: AdviceProgressInput): LifecycleProgress => {
  const currentIndex = STATUS_TO_INDEX[status];
  return {
    currentIndex,
    percent: currentIndex === LAST_INDEX ? 100 : Math.round((currentIndex / STEPS.length) * 100),
    note,
    steps: STEPS.map((step, i) => ({ ...step, state: getStepState(i, currentIndex) })),
  };
};
