import type { AssistantAction } from "@lawai/contracts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  // AI 가 제안한 행동(서버 검증됨). 사용자가 확인해야 실행된다.
  actions: AssistantAction[];
}

export const ASSISTANT_PROFILE = {
  name: "Law.ai AI 비서",
  status: "내 업무 데이터로 답해요",
};

export const ASSISTANT_POPUP = "처리할 일이나 계약에 대해 물어보세요. 배정·검토 시작도 확인만 하면 바로 해 드려요.";

export const ASSISTANT_GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "안녕하세요. 지금 보고 있는 화면과 내 계약·결재를 알고 있어요. 궁금한 걸 묻거나 시킬 일을 말씀해 주세요.",
  time: "",
  actions: [],
};

// 추천 질문 — 답은 매번 실제 AI 가 내 데이터로 만든다.
export const ASSISTANT_SUGGESTIONS = [
  "오늘 내가 처리할 일 정리해줘",
  "기한이 가까운 계약 알려줘",
  "미배정 계약 누구한테 배정하면 좋을까?",
  "결재 기다리는 문서 요약해줘",
];
