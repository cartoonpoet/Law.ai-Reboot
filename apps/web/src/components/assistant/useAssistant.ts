import { useContext } from "react";
import { AssistantContext } from "./assistantContext";

export const useAssistant = () => {
  const assistant = useContext(AssistantContext);
  if (!assistant) throw new Error("useAssistant 는 AssistantProvider 안에서만 쓸 수 있습니다");
  return assistant;
};
