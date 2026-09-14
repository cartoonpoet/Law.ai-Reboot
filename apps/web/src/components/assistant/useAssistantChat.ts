import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { AssistantAction } from "@lawai/contracts";
import { chatWithAssistant } from "../../api/assistant";
import { updateContractStatus } from "../../api/contracts";
import { ASSISTANT_GREETING, ASSISTANT_SUGGESTIONS } from "./assistantData";
import type { ChatMessage } from "./assistantData";

export type ActionStateTypes = "running" | "done" | "dismissed";

// 서버로 보내는 최근 대화 수(서버도 한 번 더 자른다)
const HISTORY_LIMIT = 12;

const formatTime = (date: Date) => date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

const getErrorText = (error: unknown) => (error instanceof Error && error.message ? error.message : "잠시 후 다시 시도해 주세요.");

export const getActionKey = (messageId: string, index: number) => `${messageId}:${index}`;

const describeDone = (action: AssistantAction) =>
  action.type === "assign"
    ? `'${action.contractTitle}' 계약을 ${action.ownerName}에게 배정했어요.`
    : action.type === "startReview"
      ? `'${action.contractTitle}' 계약의 법무 검토를 시작했어요.`
      : "";

/**
 * AI 비서 대화 — 실제 AI 답변 + 제안 행동 실행.
 * 화면 열기는 바로 이동, 배정·검토 시작은 사용자가 확인 카드를 눌러야 기존 계약 상태 변경 API 로 실행(서버 권한 검사 그대로).
 */
export const useAssistantChat = (screen: string) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([ASSISTANT_GREETING]);
  const [actionStates, setActionStates] = useState<Record<string, ActionStateTypes>>({});

  const appendAssistant = (text: string, actions: AssistantAction[] = []) =>
    setMessages((prev) => [...prev, { id: `a${prev.length}`, role: "assistant", text, time: formatTime(new Date()), actions }]);

  // 채팅 안에서 결과를 보여주므로 전역 토스트는 끈다
  const chatMutation = useMutation({ mutationFn: chatWithAssistant, meta: { errorMode: "silent" } });
  const actionMutation = useMutation({
    mutationFn: (action: AssistantAction) =>
      action.type === "assign"
        ? updateContractStatus(action.contractId, "assigning", action.ownerId)
        : action.type === "startReview"
          ? updateContractStatus(action.contractId, "legalReview")
          : Promise.reject(new Error("실행할 수 없는 요청이에요")),
    meta: { errorMode: "silent" },
  });

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

  const runAction = (messageId: string, index: number, action: AssistantAction) => {
    if (action.type === "open") {
      navigate(action.path);
      return;
    }
    const key = getActionKey(messageId, index);
    setActionStates((prev) => ({ ...prev, [key]: "running" }));
    actionMutation.mutate(action, {
      onSuccess: () => {
        setActionStates((prev) => ({ ...prev, [key]: "done" }));
        appendAssistant(describeDone(action));
        queryClient.invalidateQueries({ queryKey: ["contract", action.contractId] });
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
      onError: (error) => {
        setActionStates((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        appendAssistant(`처리하지 못했어요. ${getErrorText(error)}`);
      },
    });
  };

  const dismissAction = (messageId: string, index: number) =>
    setActionStates((prev) => ({ ...prev, [getActionKey(messageId, index)]: "dismissed" }));

  return {
    messages,
    quickReplies,
    isReplying: chatMutation.isPending,
    actionStates,
    sendMessage,
    runAction,
    dismissAction,
  };
};
