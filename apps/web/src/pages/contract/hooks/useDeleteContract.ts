import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { deleteContract } from "../../../api/contracts";

// 계약 삭제 — 성공하면 이 계약 캐시를 버리고 목록으로 이동한다.
export const useDeleteContract = (contractId: string) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => deleteContract(contractId),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["contract", contractId] });
      // 계약은 목록 외에도 대시보드·결재 대기함·AI 비서 등 여러 화면에 보이므로 전부 다시 받는다.
      void qc.invalidateQueries();
      navigate("/contract/list");
    },
    // 삭제 확인 모달이 실패 사유를 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });
  return {
    remove: () => mutation.mutate(),
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
