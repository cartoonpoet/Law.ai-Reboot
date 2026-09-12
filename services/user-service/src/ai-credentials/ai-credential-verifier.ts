// AI 자격증명 검증 포트 — 실구현은 AiServiceClient(ai-service RPC analyze 호출).
export interface AiCredentialVerifier {
  verify(input: { provider: string; model: string; apiKey: string }): Promise<boolean>;
}
