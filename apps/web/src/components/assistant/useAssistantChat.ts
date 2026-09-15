import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AssistantAction } from "@lawai/contracts";
import { chatWithAssistant } from "../../api/assistant";
import { ASSISTANT_GREETING, ASSISTANT_SUGGESTIONS } from "./assistantData";
import type { ChatMessage } from "./assistantData";
import { useAssistantActions } from "./useAssistantActions";

export type { ActionStateTypes } from "./useAssistantActions";

// 서버로 보내는 최근 대화 수(서버도 한 번 더 자른다)
const HISTORY_LIMIT = 12;

const formatTime = (date: Date) => date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

const getErrorText = (error: unknown) => (error instanceof Error && error.message ? error.message : "잠시 후 다시 시도해 주세요.");

export const getActionKey = (messageId: string, index: number) => `${messageId}:${index}`;

/**
 * AI 비서 대화 — 실제 AI 답변 + 제안 행동 실행(useAssistantActions).
 * 행동 결과(완료·실패)는 채팅 메시지로 이어 붙인다.
 */
export const useAssistantChat = (screen: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([ASSISTANT_GREETING]);
  const actions = useAssistantActions();

  const appendAssistant = (text: string, suggested: AssistantAction[] = []) =>
    setMessages((prev) => [...prev, { id: `a${prev.length}`, role: "assistant", text, time: formatTime(new Date()), actions: suggested }]);

  // 채팅 안에서 결과를 보여주므로 전역 토스트는 끈다
  const chatMutation = useMutation({ mutationFn: chatWithAssistant, meta: { errorMode: "silent" } });

  const sentTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
  const quickReplies = chatMutation.isPending ? [] : ASSISTANT_SUGGESTIONS.filter((s) => !sentTexts.includes(s));

  const sendMessage = (text: string) => {
    const userMessage: ChatMessage = { id: `u${messages.length}`, role: "user", text, time: formatTime(new Date()), actions: [] };
    const history = [...messages, userMessage];
    setMessages(history);
    chatMutation.mutate(
      {
        screen,
        messages: history
          .filter((m) => m.id !== ASSISTANT_GREETING.id)
          .slice(-HISTORY_LIMIT)
          .map((m) => ({ role: m.role, content: m.text })),
      },
      {
        onSuccess: (res) => appendAssistant(res.reply, res.actions),
        onError: (error) => appendAssistant(`답을 받지 못했어요. ${getErrorText(error)}`),
      },
    );
  };

  const runAction = (messageId: string, index: number, action: AssistantAction) =>
    actions.runAction(getActionKey(messageId, index), action, {
      onDone: (text) => appendAssistant(text),
      onError: (text) => appendAssistant(`처리하지 못했어요. ${text}`),
    });

  const dismissAction = (messageId: string, index: number) => actions.dismissAction(getActionKey(messageId, index));

  return {
    messages,
    quickReplies,
    isReplying: chatMutation.isPending,
    actionStates: actions.actionStates,
    sendMessage,
    runAction,
    dismissAction,
  };
};
