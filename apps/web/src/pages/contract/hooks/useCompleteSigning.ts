import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeSigning } from "../../../api/contracts";

// 체결 처리 — 인감 담당(sealManager)이 결재 완료된 계약을 signing → signed 로 확정한다.
// fileId 는 서버(completeSigning)가 실제 바이트가 있는 서명본을 필수로 요구하므로 옵셔널이
// 아니다(client/server 비대칭 방지 — 전체 계층에서 동일하게 required).
export const useCompleteSigning = (contractId: string) => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { signedAt: string; fileId: string; note?: string | null }) =>
      completeSigning(contractId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contract", contractId] });
      void qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
