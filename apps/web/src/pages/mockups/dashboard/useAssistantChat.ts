import { useState } from "react";
import { ASSISTANT_COMMANDS, ASSISTANT_FALLBACK, ASSISTANT_GREETING } from "./mockDashboardData";
import type { ChatMessage } from "./mockDashboardData";

/** AI 비서 대화 상태 — 목업이라 추천 명령에만 준비된 답을 돌려준다. */
export const useAssistantChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([ASSISTANT_GREETING]);

  const sentPrompts = messages.filter((m) => m.role === "user").map((m) => m.text);
  // 아직 안 보낸 추천 명령만 빠른 답장 버튼으로
  const quickReplies = ASSISTANT_COMMANDS.map((c) => c.prompt).filter((p) => !sentPrompts.includes(p));

  const sendMessage = (text: string) => {
    const reply = ASSISTANT_COMMANDS.find((c) => c.prompt === text)?.reply ?? ASSISTANT_FALLBACK;
    const nextId = messages.length;
    setMessages([
      ...messages,
      { id: `u${nextId}`, role: "user", text, time: "방금" },
      { id: `a${nextId}`, role: "assistant", text: reply, time: "방금" },
    ]);
  };

  return { messages, quickReplies, sendMessage };
};
