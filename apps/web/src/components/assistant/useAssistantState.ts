import { useState } from "react";
import { useLocation } from "react-router-dom";
import { getScreenLabel } from "./getScreenLabel";
import { useAssistantChat } from "./useAssistantChat";

export type AssistantViewTypes = "home" | "chat" | "notifications";

/**
 * AI 비서 창 상태 — 열림·보는 화면(홈/대화/알림)·먼저 말 거는 말풍선·대화.
 * 통합검색창이 "AI 비서에게 물어보기"로 질문을 넘길 수 있게 앱 틀(AssistantProvider)에서 한 번만 만든다.
 */
export const useAssistantState = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AssistantViewTypes>("home");
  const [isPopupDismissed, setIsPopupDismissed] = useState(false);
  const screenLabel = getScreenLabel(pathname);
  const chat = useAssistantChat(screenLabel);

  const open = (nextView: AssistantViewTypes) => {
    setView(nextView);
    setIsOpen(true);
    setIsPopupDismissed(true);
  };

  // 질문을 보내고 대화 화면으로 연다(추천 질문·통합검색 공용).
  const ask = (prompt: string) => {
    chat.sendMessage(prompt);
    open("chat");
  };

  return {
    isOpen,
    view,
    isPopupDismissed,
    screenLabel,
    chat,
    open,
    ask,
    close: () => setIsOpen(false),
    showView: setView,
    dismissPopup: () => setIsPopupDismissed(true),
  };
};
