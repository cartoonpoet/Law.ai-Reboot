import type { AiChatMessage } from "@lawai/contracts";

export interface AiModelOption {
  id: string;
  label: string;
  tier: "economy" | "standard" | "precision";
}
export interface AiAnalyzeInput {
  kind: string;
  model: string;
  payload: unknown;
  apiKey: string;
}
export interface AiChatInput {
  model: string;
  apiKey: string;
  system: string;
  messages: AiChatMessage[];
}
export interface AiReadDocumentInput {
  model: string;
  apiKey: string;
  fileName: string;
  mimeType: string;
  fileBase64: string;
}
export interface AiProvider {
  id: string;
  listModels(): Promise<AiModelOption[]>;
  analyze(input: AiAnalyzeInput): Promise<{ result: unknown }>;
  // 스캔 문서 글자 읽기 — 파일(이미지 PDF)을 보고 글자를 그대로 옮겨 적는다.
  readDocument(input: AiReadDocumentInput): Promise<{ text: string }>;
  // 대화 — 모델이 돌려준 JSON 문자열을 그대로 반환(해석은 호출한 서비스가 한다).
  chat(input: AiChatInput): Promise<{ content: string }>;
}

export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();
  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }
  get(id: string): AiProvider {
    const p = this.providers.get(id);
    if (!p) throw new Error(`알 수 없는 AI 프로바이더: ${id}`);
    return p;
  }
}
