/* AI 자문 도우미 결과(result: unknown) 해석 — 프롬프트가 약속한 모양만 받아들인다(캐스팅 금지). */

export interface AdviceBriefIssue {
  title: string;
  basis: string;
}

export interface ParsedAdviceBrief {
  summary: string | null;
  issues: AdviceBriefIssue[];
  checkPoints: string[];
}

const isIssue = (value: unknown): value is AdviceBriefIssue => {
  if (!value || typeof value !== "object") return false;
  const issue = value as Record<string, unknown>;
  return typeof issue.title === "string" && typeof issue.basis === "string";
};

const toStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const parseAdviceBrief = (result: unknown): ParsedAdviceBrief | null => {
  if (!result || typeof result !== "object") return null;
  const parsed = result as Record<string, unknown>;
  const issues = Array.isArray(parsed.issues) ? parsed.issues.filter(isIssue) : [];
  const summary = typeof parsed.summary === "string" ? parsed.summary : null;
  const checkPoints = toStrings(parsed.checkPoints);
  if (!summary && issues.length === 0 && checkPoints.length === 0) return null;
  return { summary, issues, checkPoints };
};
