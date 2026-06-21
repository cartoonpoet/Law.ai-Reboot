import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createContract } from "../../../api/contracts";
import { toCreateRequest } from "../toCreateRequest";
import type { ContractRequestForm } from "../request-schema";

// 계약검토 요청 제출: 폼 → 생성 API → 상세 페이지 이동. 제출/에러 상태를 선언적으로 노출.
export const useContractSubmit = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (form: ContractRequestForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createContract(toCreateRequest(form));
      navigate(`/contract/${created.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "검토요청 등록에 실패했습니다",
      );
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, submitError };
};
