import { AiAnalyzeInput, AiModelOption, AiProvider } from "./provider";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const KIND_PROMPT: Record<string, string> = {
  risk: "당신은 계약서 위험 분석 전문가입니다. 입력된 계약서 본문에서 위험 조항을 찾아 JSON으로 반환하세요.",
  summary: "당신은 계약서 요약 전문가입니다. 입력된 계약서 본문을 핵심만 요약해 JSON으로 반환하세요.",
};
const DEFAULT_PROMPT =
  "당신은 법률 문서 분석 전문가입니다. 입력을 분석해 JSON으로 반환하세요.";

const MODEL_OPTIONS: AiModelOption[] = [
  { id: "gpt-mini", label: "GPT Mini (경량)", tier: "economy" },
  { id: "gpt-standard", label: "GPT Standard (표준, 기본값)", tier: "standard" },
  { id: "gpt-precision", label: "GPT Precision (고정밀)", tier: "precision" },
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
