// AI 비서 대화 API — 서버가 내 AI 연동 키로 답하고, 실행은 검증된 제안(actions)으로만 돌려준다.
import type { AiChatMessage, AssistantChatResponse } from "@lawai/contracts";
import { apiFetch } from "./client";

export const chatWithAssistant = (body: { messages: AiChatMessage[]; screen: string }): Promise<AssistantChatResponse> =>
  apiFetch<AssistantChatResponse>("/ai/assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
