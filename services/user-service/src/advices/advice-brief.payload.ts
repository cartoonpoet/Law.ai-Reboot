import type { AdviceRegionTypes } from "@lawai/contracts";

// 에디터 HTML 을 사람이 읽는 줄글로 — AI 에는 태그 없이 내용만 보낸다.
export const toPlainText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export interface AdviceBriefSource {
  title: string;
  categories: string[];
  region: AdviceRegionTypes;
  countries: string[];
  background: string;
  question: string;
  etcRequest: string | null;
  dueDate: Date | null;
}

export interface SimilarAdviceSource {
  code: string;
  title: string;
  categories: string[];
  // 그 자문의 회신 요지(없으면 null).
  answer: string | null;
  answeredAt: Date | null;
}

/** AI 자문 도우미 입력 — 자문 내용 + 같은 회사의 비슷한 지난 자문. */
export const buildAdviceBriefPayload = (advice: AdviceBriefSource, similarAdvices: SimilarAdviceSource[]) => ({
  title: advice.title,
  categories: advice.categories,
  region: advice.region,
  countries: advice.countries,
  question: toPlainText(advice.question),
  background: toPlainText(advice.background),
  etcRequest: advice.etcRequest,
  dueDate: advice.dueDate?.toISOString().slice(0, 10) ?? null,
  similarAdvices: similarAdvices.map((similar) => ({
    code: similar.code,
    title: similar.title,
    categories: similar.categories,
    answer: similar.answer ? toPlainText(similar.answer).slice(0, 600) : null,
    answeredAt: similar.answeredAt?.toISOString().slice(0, 10) ?? null,
  })),
});
