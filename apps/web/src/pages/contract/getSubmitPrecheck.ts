import type { ApproverSnapshot } from "@lawai/contracts";

// 연간 금액이 이 값을 초과하면 재무(agree) 결재 단계 포함을 권고(경고 — 상신 자체는 막지 않음).
const FINANCE_AGREE_THRESHOLD_KRW = 100_000_000;

export interface PrecheckItem {
  key: "approvers" | "contractFile" | "financeAgree";
  ok: boolean;
  label: string;
  sub?: string;
}

export interface SubmitPrecheckResult {
  items: PrecheckItem[];
  canSubmit: boolean;
}

export interface SubmitPrecheckInput {
  plannedApprovers: ApproverSnapshot[];
  hasContractFile: boolean;
  annualAmountKrw: number | null;
}

/**
 * 체결 품의 상신 전 규칙 기반 점검(순수 함수 — 렌더 중 계산).
 * approvers/contractFile 은 필수(미충족 시 상신 불가), financeAgree 는 권고(경고만).
 */
export const getSubmitPrecheck = (
  input: SubmitPrecheckInput,
): SubmitPrecheckResult => {
  const hasApprovers = input.plannedApprovers.length > 0;
  const hasFinanceAgree = input.plannedApprovers.some((a) => a.type === "agree");
  const needsFinanceAgree =
    input.annualAmountKrw != null &&
    input.annualAmountKrw > FINANCE_AGREE_THRESHOLD_KRW;

  const items: PrecheckItem[] = [
    {
      key: "approvers",
      ok: hasApprovers,
      label: hasApprovers ? "결재선 설정됨" : "결재선이 비어 있습니다",
      sub: hasApprovers ? undefined : "결재선 설정에서 결재자를 추가해 주세요",
    },
    {
      key: "contractFile",
      ok: input.hasContractFile,
      label: input.hasContractFile ? "계약서 파일 첨부됨" : "계약서 파일이 없습니다",
      sub: input.hasContractFile ? undefined : "계약 본 파일을 첨부해 주세요",
    },
    {
      key: "financeAgree",
      ok: !needsFinanceAgree || hasFinanceAgree,
      label:
        !needsFinanceAgree || hasFinanceAgree
          ? "결재선 규정 충족"
          : "연 1억 초과 — 재무 합의 단계 권장",
      sub:
        !needsFinanceAgree || hasFinanceAgree
          ? undefined
          : "재무팀 합의(agree) 단계를 결재선에 추가하는 것을 권장합니다",
    },
  ];

  // 필수 항목만 상신 가능 여부에 반영. financeAgree 는 권고(경고)라 canSubmit 을 막지 않는다.
  const canSubmit = items
    .filter((i) => i.key !== "financeAgree")
    .every((i) => i.ok);

  return { items, canSubmit };
};
