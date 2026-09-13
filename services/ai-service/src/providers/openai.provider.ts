import { AiAnalyzeInput, AiModelOption, AiProvider } from "./provider";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const KIND_PROMPT: Record<string, string> = {
  // 사전 위험 점검(risk 의 경량 버전) — 파일 원문 없이 계약 메타데이터(title/details)만으로 1차 점검.
  precheck:
    "당신은 계약서 사전 점검 전문가입니다. 계약 메타데이터(제목/상세)를 바탕으로 " +
    '주의가 필요한 지점을 찾아 다음 JSON 스키마로 반환하세요: { "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }] }.',
  risk:
    "당신은 계약서 위험 분석 전문가입니다. 입력된 계약서 본문에서 위험 조항을 찾아 " +
    '다음 JSON 스키마로 반환하세요: { "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }] }.',
  // 상신 전(reviewDone) 결재자용 요약 브리핑.
  submitBriefing:
    "당신은 계약 검토 요약 전문가입니다. 계약 메타데이터와 결재선을 바탕으로 결재자가 " +
    '빠르게 파악할 수 있도록 다음 JSON 스키마로 반환하세요: { "summary": string, "keyFacts": [{ "label": string, "value": string }] }.',
  // 상신 성공 후 실제 결재선(approvalLine) 확정 시 결재자용 브리핑.
  approvalBriefing:
    "당신은 계약 결재 브리핑 전문가입니다. 계약 메타데이터와 확정된 결재선을 바탕으로 " +
    '결재자를 위한 요약과 위험 요인을 다음 JSON 스키마로 반환하세요: { "summary": string, "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }], "keyFacts": [{ "label": string, "value": string }] }.',
};
const DEFAULT_PROMPT =
  "당신은 법률 문서 분석 전문가입니다. 입력을 분석해 JSON으로 반환하세요.";

// id 는 OpenAI API 의 model 파라미터로 그대로 전달되므로 반드시 실제 모델 ID 여야 한다.
const MODEL_OPTIONS: AiModelOption[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini (경량)", tier: "economy" },
  { id: "gpt-4o", label: "GPT-4o (표준, 기본값)", tier: "standard" },
  { id: "gpt-4.1", label: "GPT-4.1 (고정밀)", tier: "precision" },
];

export class OpenAiProvider implements AiProvider {
  readonly id = "openai";

  async listModels(): Promise<AiModelOption[]> {
    return MODEL_OPTIONS;
  }

  async analyze(input: AiAnalyzeInput): Promise<{ result: unknown }> {
    const { kind, model, payload, apiKey } = input;
    const systemPrompt = KIND_PROMPT[kind] ?? DEFAULT_PROMPT;

    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new Error(`OpenAI 인증 실패(401): ${body}`);
      }
      if (response.status === 429) {
        throw new Error(`OpenAI 레이트리밋(429): ${body}`);
      }
      throw new Error(`OpenAI 요청 실패(${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI 응답에 컨텐츠가 없습니다");
    }

    let result: unknown;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("OpenAI 응답 JSON 파싱 실패");
    }

    return { result };
  }
}
