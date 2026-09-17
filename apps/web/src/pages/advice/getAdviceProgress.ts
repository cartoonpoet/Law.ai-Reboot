import type { AdviceResponse, AdviceStatusTypes, ApprovalLineDto } from "@lawai/contracts";
import type { LifecycleProgress, LifecycleStepStateTypes } from "../contract/getLifecycleProgress";
import { getDaysLeft } from "./getDaysLeft";

/**
 * 자문 상태 → 계약 상세와 같은 진행 게이지(LifecycleRing) 뷰모델. 렌더 중 계산하는 순수 함수.
 * 단계: 접수(자문 요청·담당 배정) → 검토(법무 검토·추가 질의) → 회신(회신 완료·종결)
 */
const ADVICE_PHASES = [
  { name: "접수", labels: ["자문 요청", "담당 배정"] },
  { name: "검토", labels: ["법무 검토", "추가 질의"] },
  { name: "회신", labels: ["회신 완료", "종결"] },
] as const;

const STEPS = ADVICE_PHASES.flatMap((phase) => phase.labels.map((label) => ({ label, phase: phase.name })));
const LAST_INDEX = STEPS.length - 1;

// 요청 결재는 "자문 요청" 단계 안, 접수는 "담당 배정"을 기다리는 중, 답변 대기는 "추가 질의", 회신 결재는 "회신 완료" 단계 안.
const STATUS_TO_INDEX: Record<AdviceStatusTypes, number> = {
  requestApproval: 0,
  requestRejected: 0,
  received: 1,
  reviewing: 2,
  waitingRequester: 3,
  answerApproval: 4,
  answered: 4,
  closed: 5,
};

const getStepState = (index: number, currentIndex: number): LifecycleStepStateTypes => {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
};

const getDueText = (dueDate: string | null, now: Date): string => {
  const daysLeft = getDaysLeft(dueDate, now);
  if (daysLeft === null) return "";
  if (daysLeft === 0) return " · 회신기한 D-day";
  return daysLeft > 0 ? ` · 회신기한 D-${daysLeft}` : ` · 회신기한 D+${-daysLeft} 지남`;
};

type AdviceProgressInput = Pick<
  AdviceResponse,
  "status" | "owner" | "requester" | "dueDate" | "answeredAt" | "closedAt" | "requestApproval" | "answerApproval"
>;

// 결재·합의 단계 중 승인된 수 — "결재 1/2 승인".
const getApprovalText = (line: ApprovalLineDto | null): string => {
  const decisionSteps = (line?.steps ?? []).filter((step) => step.type === "approve" || step.type === "agree");
  if (decisionSteps.length === 0) return "";
  const approvedCount = decisionSteps.filter((step) => step.status === "approved").length;
  return ` · ${approvedCount}/${decisionSteps.length} 승인`;
};

const getNote = (advice: AdviceProgressInput, now: Date): string => {
  const dueText = getDueText(advice.dueDate, now);
  const ownerName = advice.owner?.name ?? "담당자";
  switch (advice.status) {
    case "requestApproval":
      return `요청 결재 중${getApprovalText(advice.requestApproval)}`;
    case "requestRejected":
      return "요청 결재가 반려됐어요 · 결재선을 고쳐 다시 올려 주세요";
    case "answerApproval":
      return `회신 결재 중${getApprovalText(advice.answerApproval)}`;
    case "received":
      return `법무팀 담당 배정 대기${dueText}`;
    case "reviewing":
      return `${ownerName} 검토 중${dueText}`;
    case "waitingRequester":
      return `${advice.requester.name ?? "요청자"} 답변 대기${dueText}`;
    case "answered":
      return advice.answeredAt ? `회신일 ${advice.answeredAt.slice(0, 10)} · 확인 후 종결해 주세요` : "회신 완료";
    case "closed":
      return advice.closedAt ? `종결일 ${advice.closedAt.slice(0, 10)}` : "종결된 자문입니다";
  }
};

export const getAdviceProgress = (advice: AdviceProgressInput, now: Date): LifecycleProgress => {
  const currentIndex = STATUS_TO_INDEX[advice.status];
  return {
    currentIndex,
    percent: currentIndex === LAST_INDEX ? 100 : Math.round((currentIndex / STEPS.length) * 100),
    note: getNote(advice, now),
    steps: STEPS.map((step, index) => ({ ...step, state: getStepState(index, currentIndex) })),
  };
};
