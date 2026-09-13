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
    // 성공은 물론 실패(특히 409 — 동시 요청으로 이미 처리됨)에도 재조회한다. 서버 에러
    // 메시지에는 상태 코드가 없어 여기서 409 만 골라낼 수 없지만, 다른 실패(400 등)는 계약이
    // 안 바뀌었으니 재조회해도 무해하다 — onSettled 로 통일해 "체결 처리 버튼이 이미 처리된
    // 계약에 그대로 남아 있는" 오래된 화면을 막는다.
    onSettled: () => {
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
