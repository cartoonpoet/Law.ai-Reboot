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
import type { AiCredentialVerifier, AiCredentialVerifyResult } from "./ai-credential-verifier";

// RPC 경계를 넘어온 에러는 Error 가 아닐 수 있다(직렬화된 { message } 객체 등).
const extractMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "AI 서비스 호출에 실패했습니다";
};

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
  // 실패 사유(프로바이더의 401/429/404 메시지, ai-service 연결 실패 등)를 그대로 올려
  // 사용자가 "키가 틀렸다" 말고 실제 원인을 볼 수 있게 한다.
  async verify(input: {
    provider: string;
    model: string;
    apiKey: string;
  }): Promise<AiCredentialVerifyResult> {
    try {
      await this.analyze({
        kind: "__verify__",
        model: input.model,
        apiKey: input.apiKey,
        payload: { ping: true },
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: extractMessage(err) };
    }
  }
}
