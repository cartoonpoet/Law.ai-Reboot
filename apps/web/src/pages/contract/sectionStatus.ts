import type { ContractRequestForm } from "./request-schema";

export type SectionId = "overview" | "docs" | "people" | "terms" | "content";
export type SectionState = "done" | "partial" | "empty";

export interface SectionStatus {
  id: SectionId;
  label: string;
  requiredTotal: number;
  requiredDone: number;
  optional: boolean;
  status: SectionState;
}

const has = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : v != null && v !== "";

function statusOf(done: number, total: number, touched: boolean): SectionState {
  if (total > 0 && done >= total) return "done";
  if (done > 0 || touched) return "partial";
  return "empty";
}

export function deriveSectionStatus(v: ContractRequestForm): SectionStatus[] {
  const ov = [v.name, v.requester, v.party, v.catMajor, v.catMinor, v.counterparty];
  const ovDone = ov.filter(has).length;
  const docsDone = has(v.contractFiles) ? 1 : 0;
  const peopleTouched = [v.ccUsers, v.ccDepts, v.ccSecret, v.owner, v.project].some(has);
  const termsDone = v.money.some((m) => m.amount != null) ? 1 : 0;
  const contentDone = has(v.purpose) ? 1 : 0;
  const contentTouched = [v.payTerms, v.keyPoints, v.concerns].some(has);

  return [
    { id: "overview", label: "계약 개요", requiredTotal: 6, requiredDone: ovDone, optional: false, status: statusOf(ovDone, 6, false) },
    { id: "docs", label: "계약서 · 첨부", requiredTotal: 1, requiredDone: docsDone, optional: false, status: statusOf(docsDone, 1, false) },
    { id: "people", label: "관계자 · 참조", requiredTotal: 0, requiredDone: 0, optional: true, status: peopleTouched ? "done" : "empty" },
    { id: "terms", label: "상세 조건", requiredTotal: 1, requiredDone: termsDone, optional: false, status: statusOf(termsDone, 1, false) },
    { id: "content", label: "상세 내용", requiredTotal: 1, requiredDone: contentDone, optional: false, status: statusOf(contentDone, 1, contentTouched) },
  ];
}

export function overallPercent(sections: SectionStatus[]): number {
  const total = sections.reduce((a, s) => a + s.requiredTotal, 0);
  const done = sections.reduce((a, s) => a + Math.min(s.requiredDone, s.requiredTotal), 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function requiredTotals(sections: SectionStatus[]) {
  const total = sections.reduce((a, s) => a + s.requiredTotal, 0);
  const done = sections.reduce((a, s) => a + Math.min(s.requiredDone, s.requiredTotal), 0);
  return { total, done };
}
