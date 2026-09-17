import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createAdvice } from "../../../api/advices";
import { showToast } from "../../../lib/toast/toastStore";
import type { AdviceRequestFormTypes } from "../request/adviceRequestSchema";
import { toCreateAdviceRequest } from "../request/toCreateAdviceRequest";
import { ADVICES_QUERY_KEY } from "./useAdvicesList";

// 자문 요청 저장 — 성공하면 목록 캐시를 비우고 방금 만든 자문 상세로 간다. 실패 토스트는 전역 처리.
export const useCreateAdvice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    meta: { errorTitle: "자문을 요청하지 못했어요" },
    mutationFn: (form: AdviceRequestFormTypes) => createAdvice(toCreateAdviceRequest(form)),
    onSuccess: (advice) => {
      void queryClient.invalidateQueries({ queryKey: [ADVICES_QUERY_KEY] });
      showToast({ intent: "success", title: "자문을 요청했어요", description: `관리번호 ${advice.code}` });
      navigate(`/advice/${advice.id}`);
    },
  });

  return { submitAdvice: mutation.mutate, isSubmitting: mutation.isPending };
};
