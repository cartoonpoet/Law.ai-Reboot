import type { LifecycleProgress, LifecycleStepStateTypes } from "../../contract/getLifecycleProgress";
import { MOCK_CASES, MOCK_HEARINGS } from "./litigationMockData";

/* 사건 상세 시안이 쓰는 한 건 — 첫 번째 사건(물품대금 청구의 소). */
export const CASE = MOCK_CASES[0];

export const CASE_HEARINGS = MOCK_HEARINGS.filter((hearing) => hearing.caseId === CASE.id).toSorted((a, b) =>
  `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
);

/* 사건 진행 게이지 — 계약·자문과 같은 LifecycleRing 을 쓰기 위한 뷰모델(시안이라 고정값). */
const STEPS = [
  { label: "소장 접수", phase: "제기" },
  { label: "답변서 수령", phase: "제기" },
  { label: "1차 변론", phase: "심리" },
  { label: "2차 변론", phase: "심리" },
  { label: "선고", phase: "선고" },
  { label: "확정", phase: "선고" },
];

const CURRENT_INDEX = 3;

const getStepState = (index: number): LifecycleStepStateTypes => {
  if (index < CURRENT_INDEX) return "done";
  if (index === CURRENT_INDEX) return "current";
  return "todo";
};

export const CASE_PROGRESS: LifecycleProgress = {
  currentIndex: CURRENT_INDEX,
  percent: Math.round((CURRENT_INDEX / STEPS.length) * 100),
  note: "준비서면(2) 제출 후 9. 24. 2차 변론기일 · 제출기한 D-3",
  steps: STEPS.map((step, index) => ({ ...step, state: getStepState(index) })),
};

export interface CaseDocument {
  id: string;
  name: string;
  kind: string;
  at: string;
}

export const CASE_DOCUMENTS: CaseDocument[] = [
  { id: "d1", name: "소장.pdf", kind: "소장", at: "2026-04-02" },
  { id: "d2", name: "답변서(피고).pdf", kind: "답변서", at: "2026-05-20" },
  { id: "d3", name: "준비서면(1).pdf", kind: "준비서면", at: "2026-06-28" },
  { id: "d4", name: "위임장_세림.pdf", kind: "위임장", at: "2026-04-01" },
];

/* 우측 레일 — 담당·외부 선임 */
export const COUNSEL_ROWS = [
  { label: "사내 담당", value: `${CASE.ownerName} · ${CASE.ownerDept}` },
  { label: "선임 법무법인", value: CASE.firmName ?? "없음" },
  { label: "담당 변호사", value: "김변호사 · 010-0000-0000" },
  { label: "수임료", value: "착수금 2,000만원 · 성공보수 승소액 8%" },
  { label: "위임장", value: "위임장_세림.pdf · 2026. 4. 1. 제출" },
];
