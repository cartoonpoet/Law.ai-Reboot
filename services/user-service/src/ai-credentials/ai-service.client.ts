import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  AI_PATTERNS,
  type AiAnalyzeRequest,
  type AiAnalyzeResult,
  type AiListModelsRequest,
  type AiListModelsResult,
} from "@lawai/contracts";
import type { AiCredentialVerifier } from "./ai-credential-verifier";

@Injectable()
export class AiServiceClient implements AiCredentialVerifier {
  constructor(@Inject("AI_CLIENT") private readonly client: ClientProxy) {}

  analyze(req: AiAnalyzeRequest): Promise<AiAnalyzeResult> {
    return firstValueFrom(this.client.send<AiAnalyzeResult>(AI_PATTERNS.ANALYZE, req));
  }

  listModels(req: AiListModelsRequest): Promise<AiListModelsResult> {
    return firstValueFrom(this.client.send<AiListModelsResult>(AI_PATTERNS.LIST_MODELS, req));
  }

  // 실제 검증 — 아주 짧은 analyze 호출로 apiKey 가 유효한 OpenAI 계정인지 확인.
  async verify(input: { provider: string; model: string; apiKey: string }): Promise<boolean> {
    try {
      await this.analyze({
        kind: "__verify__",
        model: input.model,
        apiKey: input.apiKey,
        payload: { ping: true },
      });
      return true;
    } catch {
      return false;
    }
  }
}
