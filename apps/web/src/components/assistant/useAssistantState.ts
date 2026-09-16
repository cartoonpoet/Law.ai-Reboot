import { useState } from "react";
import { useLocation } from "react-router-dom";
import type { SupportContext } from "@lawai/contracts";
import { getScreenLabel } from "./getScreenLabel";
import { useAssistantChat } from "./useAssistantChat";

export type AssistantViewTypes = "home" | "chat" | "notifications" | "support";

/**
 * AI 비서 창 상태 — 열림·보는 화면(홈/대화/알림/문의)·먼저 말 거는 말풍선·대화.
 * 통합검색창이 "AI 비서에게 물어보기"로 질문을 넘기고, 오류 화면이 "이 오류 문의하기"로 문의를 열 수 있게
 * 앱 틀(AssistantProvider)에서 한 번만 만든다.
 */
export const useAssistantState = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AssistantViewTypes>("home");
  const [isPopupDismissed, setIsPopupDismissed] = useState(false);
  // 문의 화면에서 열어 본 문의(null 이면 목록), 그리고 오류 화면이 넘겨준 자동 첨부 정보.
  const [supportThreadId, setSupportThreadId] = useState<string | null>(null);
  const [supportDraftContext, setSupportDraftContext] = useState<SupportContext | null>(null);
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

  // 오류 화면의 "이 오류 문의하기" — 오류 정보를 담아 새 문의 쓰기 화면을 연다.
  const openSupport = (context: SupportContext | null = null) => {
    setSupportDraftContext(context);
    setSupportThreadId(null);
    open("support");
  };

  // 답변 알림에서 그 문의를 바로 연다.
  const openSupportThread = (threadId: string) => {
    setSupportDraftContext(null);
    setSupportThreadId(threadId);
    open("support");
  };

  return {
    isOpen,
    view,
    isPopupDismissed,
    screenLabel,
    chat,
    supportThreadId,
    supportDraftContext,
    open,
    ask,
    openSupport,
    openSupportThread,
    showSupportThread: setSupportThreadId,
    close: () => setIsOpen(false),
    showView: setView,
    dismissPopup: () => setIsPopupDismissed(true),
  };
};
