import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../../../api/auth";
import { showToast } from "../../../lib/toast/toastStore";

// 비밀번호 변경 — 실패 사유(현재 비밀번호 틀림 등)는 폼 안에 보여주므로 전역 토스트는 끈다.
export const useChangePassword = () => {
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => showToast({ intent: "success", title: "비밀번호를 변경했어요" }),
    meta: { errorMode: "silent" },
  });

  return {
    change: mutation.mutate,
    isChanging: mutation.isPending,
    serverError: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
