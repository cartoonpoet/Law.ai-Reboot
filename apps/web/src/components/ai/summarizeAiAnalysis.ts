import type { AiAnalysisDto } from "@lawai/contracts";
import { parseAiResult } from "./parseAiResult";

export type AiInsightToneTypes = "danger" | "warning" | "info" | "muted";

export interface AiInsight {
  text: string;
  tone: AiInsightToneTypes;
}

const MAX_LENGTH = 60;

const truncate = (text: string) => (text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text);

/**
 * AI 분석 한 건 → 목록에 붙일 한 줄. 진행 중이면 "분석 중", 결과가 없거나 실패·미설정이면 null(표시 안 함).
 * 리스크가 있으면 등급별 건수 + 가장 위험한 조항, 없으면 요약, 그것도 없으면 첫 핵심 사실.
 */
export const summarizeAiAnalysis = (analysis: AiAnalysisDto | null): AiInsight | null => {
  if (!analysis) return null;
  if (analysis.status === "pending" || analysis.status === "running") {
    return { text: "AI 분석 중이에요", tone: "muted" };
  }
  if (analysis.status !== "succeeded") return null;

  const { summary, risks, keyFacts } = parseAiResult(analysis.result);

  if (risks.length > 0) {
    const highCount = risks.filter((r) => r.level === "high").length;
    const mediumCount = risks.filter((r) => r.level === "medium").length;
    const lowCount = risks.length - highCount - mediumCount;
    const counts = [
      highCount > 0 ? `고위험 ${highCount}` : null,
      mediumCount > 0 ? `주의 ${mediumCount}` : null,
      lowCount > 0 ? `참고 ${lowCount}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const topRisk = risks.find((r) => r.level === "high") ?? risks.find((r) => r.level === "medium") ?? risks[0];
    return {
      text: truncate(`${counts} — ${topRisk.clause}`),
      tone: highCount > 0 ? "danger" : mediumCount > 0 ? "warning" : "info",
    };
  }
  if (summary) return { text: truncate(summary), tone: "info" };
  if (keyFacts.length > 0) return { text: truncate(`${keyFacts[0].label}: ${keyFacts[0].value}`), tone: "info" };
  return null;
};
