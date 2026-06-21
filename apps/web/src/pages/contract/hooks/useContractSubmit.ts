import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createContract, updateContract } from "../../../api/contracts";
import { toCreateRequest } from "../toCreateRequest";
import type { ContractRequestForm } from "../request-schema";

// 계약 검토 요청 제출: 생성(POST) 또는 수정(PATCH) → 상세 페이지 이동. 제출/에러 상태를 선언적으로 노출.
// 수정 시 toCreateRequest 결과(관계 포함)를 그대로 PATCH 로 보내 관계까지 전체 교체한다.
export const useContractSubmit = (mode: "create" | "edit" = "create", contractId?: string) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (form: ContractRequestForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = toCreateRequest(form);
      const saved =
        mode === "edit" && contractId
          ? await updateContract(contractId, payload)
          : await createContract(payload);
      navigate(`/contract/${saved.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : mode === "edit"
            ? "수정 저장에 실패했습니다"
            : "검토요청 등록에 실패했습니다",
      );
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, submitError };
};
