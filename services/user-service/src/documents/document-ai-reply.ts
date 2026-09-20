import type { AiReviewFinding, AiReviewSeverityTypes } from "@lawai/contracts";

const SEVERITIES: AiReviewSeverityTypes[] = ["danger", "warning", "info"];
const KINDS: AiReviewFinding["kind"][] = ["위험 조항", "빈칸", "누락 조항"];

// 모델이 ```html ... ``` 또는 ```json ... ``` 코드펜스로 감싸 보내는 경우가 흔해 벗겨낸다.
const stripCodeFence = (text: string): string => {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return match ? match[1].trim() : trimmed;
};

/** 초안 생성 응답 — HTML 그대로 쓰되 코드펜스만 벗긴다. 빈 응답이면 실패로 본다. */
export const parseDraftHtml = (content: string): string | null => {
  const html = stripCodeFence(content);
  return html.length > 0 ? html : null;
};

/** 문장 다듬기 응답 — 앞뒤 따옴표·코드펜스를 벗긴 평문. */
export const parseRewriteText = (content: string): string | null => {
  const text = stripCodeFence(content).replace(/^["']|["']$/g, "");
  return text.length > 0 ? text : null;
};

const isValidFinding = (value: unknown): value is AiReviewFinding => {
  const f = value as Partial<AiReviewFinding> | null;
  return (
    !!f &&
    typeof f.title === "string" &&
    typeof f.where === "string" &&
    typeof f.note === "string" &&
    SEVERITIES.includes(f.severity as AiReviewSeverityTypes) &&
    KINDS.includes(f.kind as AiReviewFinding["kind"])
  );
};

/** 초안 검토 응답 — `{ findings: [...] }` JSON. 형태가 안 맞는 항목은 버리고, 통째로 파싱 실패면 null. */
export const parseReviewJson = (content: string): AiReviewFinding[] | null => {
  try {
    const parsed = JSON.parse(stripCodeFence(content)) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) return null;
    return parsed.findings.filter(isValidFinding);
  } catch {
    return null;
  }
};
