import { useMutation, useQueryClient } from "@tanstack/react-query";
import { replaceSignedFile } from "../../../api/contracts";

// 서명본 교체 — 체결된 계약에서 법무팀이 새로 첨부한 파일로 서명본을 바꾼다.
export const useReplaceSignedFile = (contractId: string) => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { fileId: string; reason: string }) => replaceSignedFile(contractId, body),
    // 실패(409 등 이미 바뀐 경우)에도 최신 파일 목록을 다시 받는다 — useCompleteSigning 과 같은 이유.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["contract", contractId] });
    },
    // 모달이 실패 사유를 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });
  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
