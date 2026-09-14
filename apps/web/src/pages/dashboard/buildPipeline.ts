import type { ContractStatus } from "@lawai/contracts";
import { getStatusLabel } from "../contract/contractStatus";
import type { FlowStage } from "./dashboardTypes";

// 파이프라인에 보이는 계약 진행 단계(체결 완료·이행·종료는 "진행 중"이 아니라 제외).
export const PIPELINE_STATUSES: ContractStatus[] = ["unassigned", "assigning", "legalReview", "requesterReview", "reviewDone", "signing"];

// 검토 완료는 다음 단계로 넘어갈 준비가 된 상태라 "쌓여 있음" 판단에서 뺀다.
const DONE_STATUS: ContractStatus = "reviewDone";

/** 상태별 건수 → 파이프라인 단계. 처리 대기 단계 중 가장 많이 쌓인 곳을 표시한다. */
export const buildPipeline = (counts: Partial<Record<ContractStatus, number>>): FlowStage[] => {
  const waitingCounts = PIPELINE_STATUSES.filter((s) => s !== DONE_STATUS).map((s) => counts[s] ?? 0);
  const busiestCount = Math.max(...waitingCounts);
  const busiestStatus = busiestCount > 0 ? PIPELINE_STATUSES.find((s) => s !== DONE_STATUS && (counts[s] ?? 0) === busiestCount) : undefined;

  return PIPELINE_STATUSES.map((status) => {
    const isBusiest = status === busiestStatus;
    return {
      status,
      label: getStatusLabel(status),
      count: counts[status] ?? 0,
      isBusiest,
      tone: isBusiest ? "danger" : status === DONE_STATUS ? "success" : "neutral",
    };
  });
};
