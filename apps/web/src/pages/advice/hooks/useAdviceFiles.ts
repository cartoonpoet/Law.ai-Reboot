import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getDownloadUrl } from "../../../api/files";
import { showToast } from "../../../lib/toast/toastStore";
import { uploadAdviceFile } from "../uploadAdviceFile";
import { getAdviceQueryKey } from "./useAdviceDetail";

/** 자문 상세의 첨부 — 올리기와 내려받기. 올린 뒤에는 상세를 다시 받아 목록을 갱신한다. */
export const useAdviceFiles = (adviceId: string) => {
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = useMutation({
    meta: { errorMode: "silent" as const },
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await uploadAdviceFile(adviceId, file);
      }
      return files.length;
    },
    onSuccess: (count) => {
      setUploadError(null);
      void queryClient.invalidateQueries({ queryKey: getAdviceQueryKey(adviceId) });
      showToast({ intent: "success", title: `첨부 ${count}개를 올렸어요` });
    },
    // 파일 오류는 첨부 카드 안에 그대로 보여준다(어떤 파일이 왜 막혔는지 알아야 고칠 수 있다).
    onError: (error: Error) => setUploadError(error.message),
  });

  const download = useMutation({
    meta: { errorTitle: "파일을 열지 못했어요" },
    mutationFn: (fileId: string) => getDownloadUrl(fileId),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
  });

  return {
    uploadFiles: upload.mutate,
    isUploading: upload.isPending,
    uploadError,
    openFile: download.mutate,
    isOpening: download.isPending,
  };
};
