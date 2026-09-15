import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateContractStatus } from "../../../api/contracts";

// 만료로 종료 — 계약 이행 중인 계약을 "계약 종료(기간 만료)"로 닫는다.
export const useExpireContract = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (contractId: string) => updateContractStatus(contractId, "closed", undefined, "expired"),
    onSuccess: (_result, contractId) => {
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
    meta: { errorTitle: "만료로 종료하지 못했어요" },
  });
  return {
    expire: (contractId: string, onDone: () => void) => mutation.mutate(contractId, { onSuccess: onDone }),
    isPending: mutation.isPending,
  };
};
