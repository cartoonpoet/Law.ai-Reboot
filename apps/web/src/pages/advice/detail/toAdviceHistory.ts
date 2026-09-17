import type { TimelineItem } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
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

/** 처리 이력 — 접수·질의/회신·종결을 시간 순으로 모아 최신이 위로 오게 한다. 가장 최근 항목을 "지금"으로 강조. */
export const toAdviceHistory = (advice: AdviceResponse): TimelineItem[] => {
  const events: HistoryEvent[] = [
    { id: "created", at: advice.createdAt, title: "자문 요청 접수", who: advice.createdBy.name ?? "-" },
    ...advice.messages.map((message) => ({
      id: message.id,
      at: message.createdAt,
      title: `${MESSAGE_KIND_LABEL[message.kind]} 등록`,
      who: message.author.name ?? "-",
    })),
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
