import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createAdvice } from "../../../api/advices";
import { uploadAdviceFile } from "../uploadAdviceFile";
import { showToast } from "../../../lib/toast/toastStore";
import type { AdviceRequestFormTypes } from "../request/adviceRequestSchema";
import { toCreateAdviceRequest } from "../request/toCreateAdviceRequest";
import { ADVICES_QUERY_KEY } from "./useAdvicesList";

// 자문 요청 저장 — 자문을 만든 뒤 첨부를 올리고, 목록 캐시를 비운 다음 방금 만든 자문 상세로 간다.
// 첨부가 실패해도 자문 자체는 이미 만들어졌으므로 상세로 보내고 무엇이 실패했는지 알린다.
export const useCreateAdvice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    meta: { errorTitle: "자문을 요청하지 못했어요" },
    mutationFn: async (form: AdviceRequestFormTypes) => {
      const advice = await createAdvice(toCreateAdviceRequest(form));
      const failedFiles: string[] = [];
      for (const file of form.files) {
        try {
          await uploadAdviceFile(advice.id, file);
        } catch {
          failedFiles.push(file.name);
        }
      }
      return { advice, failedFiles };
    },
    onSuccess: ({ advice, failedFiles }) => {
      void queryClient.invalidateQueries({ queryKey: [ADVICES_QUERY_KEY] });
      showToast({ intent: "success", title: "자문을 요청했어요", description: `관리번호 ${advice.code}` });
      if (failedFiles.length > 0) {
        showToast({
          intent: "warning",
          title: "첨부를 올리지 못했어요",
          description: `${failedFiles.join(", ")} — 상세 화면에서 다시 올려 주세요`,
        });
      }
      navigate(`/advice/${advice.id}`);
    },
  });

  return { submitAdvice: mutation.mutate, isSubmitting: mutation.isPending };
};
