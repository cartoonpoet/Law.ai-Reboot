// AI 비서 대화 API — 서버가 내 AI 연동 키로 답하고, 실행은 검증된 제안(actions)으로만 돌려준다.
import type { AiChatMessage, AssistantChatResponse, DashboardBriefResponse } from "@lawai/contracts";
import { apiFetch } from "./client";

export const chatWithAssistant = (body: { messages: AiChatMessage[]; screen: string }): Promise<AssistantChatResponse> =>
  apiFetch<AssistantChatResponse>("/ai/assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

// 대시보드 AI 브리핑 — 서버가 업무 데이터가 그대로면 30분간 같은 결과를 준다. refresh 면 다시 만든다.
export const getDashboardBrief = (refresh: boolean): Promise<DashboardBriefResponse> =>
  apiFetch<DashboardBriefResponse>(`/ai/assistant/brief${refresh ? "?refresh=true" : ""}`);
