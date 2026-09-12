import type { ContractStatus } from "@lawai/contracts";

/**
 * 계약 상태에서 현재 노출할 AI 분석 kind 를 파생한다(순수 함수).
 * services/ai-service KIND_PROMPT(precheck/risk/submitBriefing/approvalBriefing) 와 1:1 대응.
 * 트리거 대상이 아닌 상태는 null(해당 단계는 AI 분석을 제공하지 않음).
 */
export const getActiveAiKind = (status: ContractStatus): string | null => {
  switch (status) {
    case "draft":
    case "unassigned":
      return "precheck";
    case "legalReview":
      return "risk";
    case "reviewDone":
      return "submitBriefing";
    case "signing":
      return "approvalBriefing";
    default:
      return null;
  }
};
