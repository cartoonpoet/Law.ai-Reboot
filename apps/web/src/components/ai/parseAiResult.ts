/* =========================================================================
 * AI 분석 결과(AiAnalysisDto.result: unknown) 해석 — ai-service KIND_PROMPT 가 kind 별로
 * 다른 JSON(risks / summary / keyFacts)을 돌려주므로 타입가드로 안전하게 파싱한다(임의 캐스팅 금지).
 * ======================================================================= */

export type AiRiskLevelTypes = "low" | "medium" | "high";

export interface AiResultRisk {
  level: AiRiskLevelTypes;
  clause: string;
  finding: string;
}

export interface AiResultKeyFact {
  label: string;
  value: string;
}

export interface ParsedAiResult {
  summary: string | null;
  risks: AiResultRisk[];
  keyFacts: AiResultKeyFact[];
}

const isAiResultRisk = (value: unknown): value is AiResultRisk => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.level === "low" || v.level === "medium" || v.level === "high") &&
    typeof v.clause === "string" &&
    typeof v.finding === "string"
  );
};

const isAiResultKeyFact = (value: unknown): value is AiResultKeyFact => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.label === "string" && typeof v.value === "string";
};

// kind 무관하게 최소 표시 가능한 형태로 파싱한다. 알 수 없는 필드/형태는 조용히 무시.
export const parseAiResult = (result: unknown): ParsedAiResult => {
  if (!result || typeof result !== "object") {
    return { summary: null, risks: [], keyFacts: [] };
  }
  const v = result as Record<string, unknown>;
  return {
    summary: typeof v.summary === "string" ? v.summary : null,
    risks: Array.isArray(v.risks) ? v.risks.filter(isAiResultRisk) : [],
    keyFacts: Array.isArray(v.keyFacts) ? v.keyFacts.filter(isAiResultKeyFact) : [],
  };
};
