import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContractStatus } from "@lawai/contracts";
import { updateContractStatus } from "../../../api/contracts";

interface ChangeStatusVars {
  status: ContractStatus;
  ownerId?: string | null;
}

// 계약 상태 전이/배정. 배정은 status="assigning" + ownerId 동반.
// 성공 시 해당 계약 상세 캐시 무효화로 재조회.
export const useContractStatus = (id: string) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ status, ownerId }: ChangeStatusVars) =>
      updateContractStatus(id, status, ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    meta: { errorTitle: "계약 상태를 변경하지 못했어요" },
  });

  return {
    // ownerId 미지정이면 순수 상태 전이(반려/검토완료), 지정 시 배정.
    changeStatus: (status: ContractStatus, ownerId?: string | null) =>
      mutation.mutate({ status, ownerId }),
    isUpdating: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
