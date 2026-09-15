import { createContext } from "react";
import type { useAssistantState } from "./useAssistantState";

export type AssistantContextValue = ReturnType<typeof useAssistantState>;

export const AssistantContext = createContext<AssistantContextValue | null>(null);
