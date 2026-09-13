import type { ApprovalLineResponse, ContractStatus } from "@lawai/contracts";

/**
 * 실 status(ContractStatus) + 부가 데이터(담당자·검토기한·결재선·체결일)를 계약 상세 진행 게이지 뷰모델로 변환한다.
 * 순수 함수(렌더 중 계산 — useEffect 금지). now 는 D-day 계산용으로 호출부가 주입(테스트 고정).
 *
 * status → 단계 인덱스(0-based):
 *  0 임시저장 1 검토의뢰 2 배정 3 법무검토 4 요청자검토 5 검토완료
 *  6 체결진행 7 체결완료 8 계약이행 9 계약종료
 */

export const LIFECYCLE_PHASES = [
  { name: "요청", labels: ["임시 저장", "검토 의뢰", "배정"] },
  { name: "검토", labels: ["법무 검토", "요청자 검토", "검토 완료"] },
  { name: "체결", labels: ["체결 진행", "체결 완료"] },
  { name: "이행", labels: ["계약 이행", "계약 종료"] },
] as const;

const STATUS_TO_INDEX: Record<ContractStatus, number> = {
  draft: 0,
  unassigned: 1,
  assigning: 2,
  legalReview: 3,
  requesterReview: 4,
  reviewDone: 5,
  signing: 6,
  signed: 7,
  fulfilling: 8,
  closed: 9,
};

export type LifecycleStepStateTypes = "done" | "current" | "todo";

export interface LifecycleStepView {
  label: string;
  phase: string;
  state: LifecycleStepStateTypes;
}

export interface LifecycleProgress {
  currentIndex: number;
  // 전체 진행률(0~100). 체결 진행은 결재 승인 비율만큼 단계 안에서 더 찬다.
  percent: number;
  // 현재 단계에서 지금 무슨 일이 일어나는지(한 줄)
  note: string;
  steps: LifecycleStepView[];
}

export interface LifecycleProgressInput {
  status: ContractStatus;
  ownerName: string | null;
  dueDate: string | null;
  signedAt: string | null;
  period: string;
  approvalLine: ApprovalLineResponse | null;
  now: Date;
}

const DAY_MS = 86_400_000;

const STEPS: LifecycleStepView[] = LIFECYCLE_PHASES.flatMap((phase) =>
  phase.labels.map((label) => ({ label, phase: phase.name, state: "todo" as const })),
);

const LAST_INDEX = STEPS.length - 1;

const getStepState = (index: number, currentIndex: number): LifecycleStepStateTypes => {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
};

// 검토기한 D-day 문구. 기한이 없으면 빈 문자열.
const getDueText = (dueDate: string | null, now: Date) => {
  if (!dueDate) return "";
  const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / DAY_MS);
  if (days === 0) return " · 검토기한 D-day";
  if (days > 0) return ` · 검토기한 D-${days}`;
  return ` · 검토기한 D+${-days} 경과`;
};

// 결재(approve/agree) 스텝 중 승인된 수. 기안·참조는 결정 대상이 아니라 제외.
const getApprovalCount = (line: ApprovalLineResponse | null) => {
  const decisionSteps = (line?.steps ?? []).filter((s) => s.type === "approve" || s.type === "agree");
  return {
    approved: decisionSteps.filter((s) => s.status === "approved").length,
    total: decisionSteps.length,
  };
};

const getSigningNote = (line: ApprovalLineResponse | null) => {
  const { approved, total } = getApprovalCount(line);
  if (total === 0) return "체결 품의 결재 진행 중";
  if (approved < total) return `결재 ${approved}/${total} 승인 · 결재 진행 중`;
  return "결재 완료 · 인감담당 체결 처리 대기";
};

const getNote = (input: LifecycleProgressInput) => {
  const dueText = getDueText(input.dueDate, input.now);
  switch (input.status) {
    case "draft":
      return "작성 중 · 제출하면 법무팀으로 의뢰됩니다";
    case "unassigned":
      return `법무팀 배정 대기${dueText}`;
    case "assigning":
      return `법무 담당자 배정 중${dueText}`;
    case "legalReview":
      return `${input.ownerName ?? "법무 담당자"} 검토 중${dueText}`;
    case "requesterReview":
      return `요청자 확인 대기${dueText}`;
    case "reviewDone":
      return "체결 품의 상신이 필요합니다";
    case "signing":
      return getSigningNote(input.approvalLine);
    case "signed":
      return input.signedAt ? `체결일 ${input.signedAt.slice(0, 10)}` : "체결 완료";
    case "fulfilling":
      return `계약 기간 ${input.period}`;
    case "closed":
      return "계약이 종료되었습니다";
  }
};

// 단계 안 진행 비율(0~1) — 현재는 체결 진행의 결재 승인 비율만 반영.
const getInStepRatio = (input: LifecycleProgressInput) => {
  if (input.status !== "signing") return 0;
  const { approved, total } = getApprovalCount(input.approvalLine);
  return total === 0 ? 0 : approved / total;
};

export const getLifecycleProgress = (input: LifecycleProgressInput): LifecycleProgress => {
  const currentIndex = STATUS_TO_INDEX[input.status] ?? 0;
  const percent =
    currentIndex === LAST_INDEX
      ? 100
      : Math.round(((currentIndex + getInStepRatio(input)) / STEPS.length) * 100);
  return {
    currentIndex,
    percent,
    note: getNote(input),
    steps: STEPS.map((step, i) => ({ ...step, state: getStepState(i, currentIndex) })),
  };
};

// 가리킨 단계가 현재 기준 어디쯤인지 — Tooltip·Popover 공통 문구
export const getStepRelation = (index: number, progress: LifecycleProgress) => {
  const { currentIndex, note } = progress;
  if (index < currentIndex) return `완료 · ${currentIndex - index}단계 전`;
  if (index === currentIndex) return `지금 · ${note}`;
  if (index === currentIndex + 1) return "다음 단계";
  return `예정 · ${index - currentIndex}단계 뒤`;
};
