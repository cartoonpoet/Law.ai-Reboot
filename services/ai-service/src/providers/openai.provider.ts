import { AiAnalyzeInput, AiChatInput, AiModelOption, AiProvider, AiReadDocumentInput } from "./provider";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

type OpenAiContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };
type OpenAiMessage = { role: string; content: string | OpenAiContentPart[] };

// 스캔 계약서 글자 옮겨 적기 — 요약·해석 없이 원문 그대로.
const READ_DOCUMENT_PROMPT =
  "당신은 문서 전사 전문가입니다. 첨부된 스캔 계약서의 글자를 쪽 순서대로 빠짐없이 그대로 옮겨 적으세요. " +
  "요약·해석·맞춤법 교정을 하지 말고, 조항 번호와 줄바꿈을 살리고, 표는 한 행을 한 줄로 적으세요. " +
  "읽을 수 없는 글자는 [판독불가] 로 적으세요. " +
  '다음 JSON 스키마로 반환하세요: { "text": string }.';

const KIND_PROMPT: Record<string, string> = {
  // 사전 위험 점검(risk 의 경량 버전) — 파일 원문 없이 계약 메타데이터(title/details)만으로 1차 점검.
  precheck:
    "당신은 계약서 사전 점검 전문가입니다. 계약 메타데이터(title/details)와, 있으면 계약서 본문(fileText)을 바탕으로 " +
    "fileText 가 있으면 조항을 근거로, 없으면(null) 메타데이터만으로 판단했다고 finding 에 밝히고 " +
    '주의가 필요한 지점을 찾아 다음 JSON 스키마로 반환하세요: { "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }] }.',
  risk:
    "당신은 계약서 위험 분석 전문가입니다. 계약서 본문(fileText)에서 위험 조항을 찾아 clause 에 조항 번호·제목을, finding 에 이유와 수정 방향을 쓰고 " +
    "fileText 가 없으면(null) 본문 없이 메타데이터(title/details)만으로 추정했다고 finding 에 밝히고 " +
    '다음 JSON 스키마로 반환하세요: { "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }] }.',
  // 만료 관리 — 자동갱신 조항과 해지 통지 기한 추출.
  renewalTerms:
    "당신은 계약 갱신 조항 분석 전문가입니다. 계약서 본문(fileText)과 계약 기간(periodStart/periodEnd)을 보고 " +
    "자동갱신 여부와 해지 통지 기한을 찾으세요. noticeDeadline 은 periodEnd 에서 noticeDays 를 뺀 날짜(YYYY-MM-DD)이며, " +
    "fileText 가 없으면(null) autoRenewal 을 false 로 두고 summary 에 본문이 없어 판단하지 못했다고 밝히세요. " +
    '다음 JSON 스키마로 반환하세요: { "autoRenewal": boolean, "renewalPeriod": string|null, "noticeDays": number|null, "noticeDeadline": string|null, "clause": string|null, "summary": string }.',
  // 상신 전(reviewDone) 결재자용 요약 브리핑.
  submitBriefing:
    "당신은 계약 검토 요약 전문가입니다. 계약 메타데이터와 결재선을 바탕으로 결재자가 " +
    '빠르게 파악할 수 있도록 다음 JSON 스키마로 반환하세요: { "summary": string, "keyFacts": [{ "label": string, "value": string }] }.',
  // 상신 성공 후 실제 결재선(approvalLine) 확정 시 결재자용 브리핑.
  approvalBriefing:
    "당신은 계약 결재 브리핑 전문가입니다. 계약 메타데이터와 확정된 결재선을 바탕으로 " +
    '결재자를 위한 요약과 위험 요인을 다음 JSON 스키마로 반환하세요: { "summary": string, "risks": [{ "level": "low"|"medium"|"high", "clause": string, "finding": string }], "keyFacts": [{ "label": string, "value": string }] }.',
  // 법률자문 도우미 — 담당 변호사가 검토를 시작하기 전에 볼 요지·쟁점·확인할 점.
  adviceBrief:
    "당신은 사내 법무팀을 돕는 법률자문 분석 전문가입니다. 자문 요청(질의의 요지·사안의 배경·분류·관련 국가)과 " +
    "같은 회사의 비슷한 지난 자문(similarAdvices)을 보고, 담당 변호사가 검토를 시작할 때 쓸 정리를 만드세요. " +
    "issues 의 basis 에는 근거가 될 법령·조문이나 확인해야 할 자료를 적고, 추측이면 추측이라고 밝히세요. " +
    "checkPoints 에는 요청자에게 추가로 물어봐야 할 점을 적으세요. 한국어로 답하세요. " +
    '다음 JSON 스키마로 반환하세요: { "summary": string, "issues": [{ "title": string, "basis": string }], "checkPoints": [string] }.',
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
    const content = await this.requestJsonCompletion(apiKey, model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload) },
    ]);

    let result: unknown;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("OpenAI 응답 JSON 파싱 실패");
    }

    return { result };
  }

  // 스캔 문서 읽기 — PDF 를 파일 입력으로 보내고(모델이 쪽마다 이미지로 본다) 옮겨 적은 글자를 받는다.
  async readDocument(input: AiReadDocumentInput): Promise<{ text: string }> {
    const content = await this.requestJsonCompletion(input.apiKey, input.model, [
      { role: "system", content: READ_DOCUMENT_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: { filename: input.fileName, file_data: `data:${input.mimeType};base64,${input.fileBase64}` },
          },
          { type: "text", text: "이 문서의 글자를 옮겨 적어 주세요." },
        ],
      },
    ]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI 응답 JSON 파싱 실패");
    }
    const text = (parsed as { text?: unknown }).text;
    if (typeof text !== "string") {
      throw new Error("OpenAI 응답에 문서 글자(text)가 없습니다");
    }
    return { text };
  }

  // AI 비서 대화 — 시스템 지시 + 대화 기록을 보내고 JSON 문자열을 그대로 돌려준다(해석은 user-service).
  async chat(input: AiChatInput): Promise<{ content: string }> {
    const content = await this.requestJsonCompletion(input.apiKey, input.model, [
      { role: "system", content: input.system },
      ...input.messages,
    ]);
    return { content };
  }

  private async requestJsonCompletion(
    apiKey: string,
    model: string,
    messages: OpenAiMessage[],
  ): Promise<string> {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
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
    return content;
  }
}
