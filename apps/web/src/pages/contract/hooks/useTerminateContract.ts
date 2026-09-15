import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TerminationReason } from "@lawai/contracts";
import { terminateContract } from "../../../api/contracts";

interface TerminateBody {
  terminatedOn: string;
  reason: TerminationReason;
  note?: string;
  fileId: string;
}

// 중도 해지 — 체결 완료·계약 이행 계약을 해지 서류와 함께 종료한다.
export const useTerminateContract = (contractId: string) => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: TerminateBody) => terminateContract(contractId, body),
    // 실패(409 — 이미 종료됨 등)에도 최신 상태·첨부 목록을 다시 받는다(서명본 교체와 같은 이유).
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["contract", contractId] });
      void qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    // 해지 모달이 실패 사유를 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });
  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
