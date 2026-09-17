import type { TimelineItem } from "@lawkit/ui";
import type { AdviceResponse, ApprovalLineDto } from "@lawai/contracts";
import { MESSAGE_KIND_LABEL } from "../adviceMeta";

// "2026-09-16T00:30:00Z" → "09.16 09:30"(보는 사람 시간대).
export const formatShortDateTime = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

interface HistoryEvent {
  id: string;
  at: string;
  title: string;
  who: string;
}

// 결재 한 건 → 상신 + 결재자별 승인·반려(기안·참조 제외).
const toApprovalEvents = (line: ApprovalLineDto | null, label: string): HistoryEvent[] => {
  if (!line) return [];
  const decisions = line.steps
    .filter((step) => (step.type === "approve" || step.type === "agree") && step.decidedAt)
    .map((step) => ({
      id: `${line.id}-${step.id}`,
      at: step.decidedAt as string,
      title: `${label} ${step.status === "rejected" ? "반려" : "승인"}`,
      who: step.name,
    }));
  return [{ id: line.id, at: line.submittedAt, title: `${label} 상신`, who: line.submittedByName }, ...decisions];
};

/** 처리 이력 — 접수·결재·질의/회신·종결을 시간 순으로 모아 최신이 위로 오게 한다. 가장 최근 항목을 "지금"으로 강조. */
export const toAdviceHistory = (advice: AdviceResponse): TimelineItem[] => {
  const events: HistoryEvent[] = [
    { id: "created", at: advice.createdAt, title: "자문 요청 접수", who: advice.createdBy.name ?? "-" },
    ...advice.messages.map((message) => ({
      id: message.id,
      at: message.createdAt,
      title: `${MESSAGE_KIND_LABEL[message.kind]} 등록`,
      who: message.author.name ?? "-",
    })),
    ...toApprovalEvents(advice.requestApproval, "요청 결재"),
    ...toApprovalEvents(advice.answerApproval, "회신 결재"),
    ...(advice.closedAt ? [{ id: "closed", at: advice.closedAt, title: "종결", who: "" }] : []),
  ];

  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((event, index) => ({
      id: event.id,
      title: event.title,
      description: [formatShortDateTime(event.at), event.who].filter(Boolean).join(" · "),
      status: index === 0 ? "current" : "done",
    }));
};
