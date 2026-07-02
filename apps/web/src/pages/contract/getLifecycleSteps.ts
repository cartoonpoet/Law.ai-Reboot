import type { ContractStatus } from "@lawai/contracts";
import { LIFECYCLE } from "./mock-data";
import type { LifecycleStep } from "./mock-data";

/**
 * 실 status(ContractStatus) 를 라이프사이클(StepBar 10단계) 진행도로 동기화한다.
 * LIFECYCLE 단계 라벨은 mock 으로 고정하되, completed/active/scheduled 만 실 status 에서 파생한다.
 * 순수 함수(렌더 중 계산 — useEffect 금지).
 *
 * status → LIFECYCLE 인덱스(0-based) 매핑:
 *  0 임시저장 1 검토의뢰 2 배정 3 법무검토 4 요청자검토 5 검토완료
 *  6 체결진행 7 체결완료 8 계약이행 9 계약종료
 */
const STATUS_TO_INDEX: Record<ContractStatus, number> = {
  draft: 0,
  unassigned: 1, // 검토 의뢰됨(아직 배정 전)
  assigning: 2,
  legalReview: 3,
  requesterReview: 4,
  reviewDone: 5,
  signing: 6,
  signed: 7,
  fulfilling: 8,
  closed: 9,
};

const getStepStatus = (
  index: number,
  activeIndex: number,
): LifecycleStep["status"] => {
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "active";
  return "scheduled";
};

export const getLifecycleSteps = (status: ContractStatus): LifecycleStep[] => {
  const activeIndex = STATUS_TO_INDEX[status] ?? 0;
  return LIFECYCLE.map((step, i) => ({
    label: step.label,
    status: getStepStatus(i, activeIndex),
  }));
};
