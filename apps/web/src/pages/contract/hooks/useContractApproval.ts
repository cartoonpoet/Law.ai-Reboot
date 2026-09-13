import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitContractApproval } from "../../../api/contracts";
import { decideApproval } from "../../../api/approvals";

interface DecideVars {
  lineId: string;
  decision: "approve" | "reject";
  comment?: string;
}

// 체결 품의 상신 + 결재 승인/반려. 성공 시 계약 상세·대기함 캐시 무효화로 재조회.
export const useContractApproval = (contractId: string) => {
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: () => submitContractApproval(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  const decide = useMutation({
    mutationFn: ({ lineId, decision, comment }: DecideVars) =>
      decideApproval(lineId, { decision, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["approvalInbox"] });
    },
  });

  return {
    submitApproval: () => submit.mutate(),
    isSubmitting: submit.isPending,
    submitError: submit.error instanceof Error ? submit.error.message : null,
    decideApproval: (lineId: string, decision: "approve" | "reject", comment?: string) =>
      decide.mutate({ lineId, decision, comment }),
    isDeciding: decide.isPending,
    decideError: decide.error instanceof Error ? decide.error.message : null,
  };
};
