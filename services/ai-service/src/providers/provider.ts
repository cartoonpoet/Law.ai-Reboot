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
export interface AiProvider {
  id: string;
  listModels(): Promise<AiModelOption[]>;
  analyze(input: AiAnalyzeInput): Promise<{ result: unknown }>;
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
