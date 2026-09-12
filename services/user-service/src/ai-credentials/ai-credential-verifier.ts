// AI 자격증명 검증 포트 — 실구현은 AiServiceClient(ai-service RPC analyze 호출).
// 실패를 boolean 으로 뭉개면 "키가 틀림"과 "ai-service 불통/모델 없음/레이트리밋"이
// 모두 같은 메시지로 보여 진단이 불가능하므로, 실패 사유를 그대로 싣고 올린다.
export type AiCredentialVerifyResult = { ok: true } | { ok: false; message: string };

export interface AiCredentialVerifier {
  verify(input: {
    provider: string;
    model: string;
    apiKey: string;
  }): Promise<AiCredentialVerifyResult>;
}
