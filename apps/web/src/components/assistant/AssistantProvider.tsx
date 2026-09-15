import type { ReactNode } from "react";
import { AssistantContext } from "./assistantContext";
import { useAssistantState } from "./useAssistantState";

interface AssistantProviderProps {
  children: ReactNode;
}

// AI 비서 상태를 앱 틀에서 공유한다(비서 창 · 통합검색창의 "AI 비서에게 물어보기").
export const AssistantProvider = ({ children }: AssistantProviderProps) => {
  const assistant = useAssistantState();
  return <AssistantContext.Provider value={assistant}>{children}</AssistantContext.Provider>;
};
