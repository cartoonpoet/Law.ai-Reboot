import type { ContractSummary } from "@lawai/contracts";
import type { ContractRow } from "./mock-data";
import { getStatusLabel } from "./contractStatus";

const fmtDate = (iso: string | null): string => (iso ? iso.slice(0, 10) : "-");

// 검토기한까지 남은 일수(올림). dueDate 없으면 0.
export const daysLeft = (iso: string | null): number => {
  if (!iso) return 0;
  const due = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / 86_400_000);
};

// 목록 요약(ContractSummary) → 테이블 행(ContractRow).
export const toListRow = (s: ContractSummary): ContractRow => ({
  id: s.id,
  code: s.code,
  name: s.title,
  party: s.party ?? "-",
  sub: s.categoryLabel ?? "-",
  counter: s.counterpartyName ?? "-",
  requester: s.requesterName ?? s.requesterId ?? "-",
  owner: s.ownerName ?? s.ownerId ?? "미배정",
  updated: fmtDate(s.updatedAt),
  due: fmtDate(s.dueDate),
  dleft: daysLeft(s.dueDate),
  status: getStatusLabel(s.status),
  secure: s.securityLevel !== "normal",
  star: false,
  mine: false,
});
