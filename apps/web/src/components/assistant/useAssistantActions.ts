import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { AssistantAction } from "@lawai/contracts";
import { updateContractStatus } from "../../api/contracts";

export type ActionStateTypes = "running" | "done" | "dismissed";

const getErrorText = (error: unknown) => (error instanceof Error && error.message ? error.message : "잠시 후 다시 시도해 주세요.");

export const describeActionDone = (action: AssistantAction) =>
  action.type === "assign"
    ? `'${action.contractTitle}' 계약을 ${action.ownerName}에게 배정했어요.`
    : action.type === "startReview"
      ? `'${action.contractTitle}' 계약의 법무 검토를 시작했어요.`
      : "";

/**
 * AI 가 제안한 행동 실행 — AI 비서 대화와 대시보드 브리핑 공통.
 * 화면 열기는 바로 이동, 배정·검토 시작은 사용자가 확인한 뒤 기존 계약 상태 변경 API 로(서버 권한 검사 그대로).
 */
export const useAssistantActions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionStates, setActionStates] = useState<Record<string, ActionStateTypes>>({});

  // 결과는 호출한 화면(채팅·카드)이 보여주므로 전역 토스트는 끈다
  const mutation = useMutation({
    mutationFn: (action: AssistantAction) =>
      action.type === "assign"
        ? updateContractStatus(action.contractId, "assigning", action.ownerId)
        : action.type === "startReview"
          ? updateContractStatus(action.contractId, "legalReview")
          : Promise.reject(new Error("실행할 수 없는 요청이에요")),
    meta: { errorMode: "silent" },
  });

  const runAction = (key: string, action: AssistantAction, callbacks: { onDone: (text: string) => void; onError: (text: string) => void }) => {
    if (action.type === "open") {
      navigate(action.path);
      return;
    }
    setActionStates((prev) => ({ ...prev, [key]: "running" }));
    mutation.mutate(action, {
      onSuccess: () => {
        setActionStates((prev) => ({ ...prev, [key]: "done" }));
        callbacks.onDone(describeActionDone(action));
        queryClient.invalidateQueries({ queryKey: ["contract", action.contractId] });
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
      onError: (error) => {
        // 다시 누를 수 있게 상태를 되돌린다
        setActionStates((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        callbacks.onError(getErrorText(error));
      },
    });
  };

  const dismissAction = (key: string) => setActionStates((prev) => ({ ...prev, [key]: "dismissed" }));

  return { actionStates, runAction, dismissAction };
};
