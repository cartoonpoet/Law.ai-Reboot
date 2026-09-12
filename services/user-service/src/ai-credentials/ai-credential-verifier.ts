// AI 자격증명 검증 포트 — Task 6 에서 실제 ai-service RPC(ai.listModels 등) 호출로 구현체 교체.
export interface AiCredentialVerifier {
  verify(input: { provider: string; model: string; apiKey: string }): Promise<boolean>;
}
