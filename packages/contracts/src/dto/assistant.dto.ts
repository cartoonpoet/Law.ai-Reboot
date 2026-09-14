import type { TenantContext } from "./tenant.dto";

export type AiChatRole = "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

// ai-service 내부 RPC(무상태) — 시스템 지시 + 대화를 보내 모델이 돌려준 JSON 문자열을 받는다.
export interface AiChatRequest {
  model: string;
  apiKey: string;
  system: string;
  messages: AiChatMessage[];
}

export interface AiChatResult {
  content: string;
}

// AI 비서가 제안하는 행동. 서버가 실제 데이터·권한으로 검증한 것만 내려가고,
// 사용자가 화면에서 확인해야 기존 API(계약 상태 변경 등)로 실행된다.
export type AssistantAction =
  | { type: "open"; label: string; path: string }
  | { type: "assign"; contractId: string; contractTitle: string; ownerId: string; ownerName: string }
  | { type: "startReview"; contractId: string; contractTitle: string };

export interface AssistantChatRequest {
  messages: AiChatMessage[];
  // 사용자가 지금 보고 있는 화면 이름(대시보드·계약 상세 등)
  screen: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface AssistantChatResponse {
  reply: string;
  actions: AssistantAction[];
  // 내 AI 연동(API 키)이 없어 답하지 못한 경우
  needsSetup: boolean;
}
