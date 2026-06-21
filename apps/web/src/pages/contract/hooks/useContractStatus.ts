import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContractStatus } from "@lawai/contracts";
import { updateContractStatus } from "../../../api/contracts";

// 계약 상태 전이. 성공 시 해당 계약 상세 캐시 무효화로 재조회.
export const useContractStatus = (id: string) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: ContractStatus) => updateContractStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  return {
    changeStatus: (status: ContractStatus) => mutation.mutate(status),
    isUpdating: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
