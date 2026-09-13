// kind 별 AI 분석 입력 페이로드 빌더(순수 함수). 계약 row(응답 형태) → payload 객체.
// 1차 범위: 파일 원문 텍스트 추출(OCR 등) 없이 계약 메타데이터만 넘긴다 — fileText 는 항상 null 로 고정.
// 후속 과제: 계약서 파일에서 원문 텍스트를 추출해 buildRiskPayload 의 fileText 를 채운다.
export interface ContractLike {
  title: string;
  details: unknown;
  plannedApprovers?: unknown;
}

export const buildPrecheckPayload = (contract: ContractLike) => ({
  title: contract.title,
  details: contract.details,
});

export const buildRiskPayload = (contract: ContractLike, fileText: string | null) => ({
  title: contract.title,
  details: contract.details,
  fileText,
});

export const buildSubmitBriefingPayload = (contract: ContractLike) => ({
  title: contract.title,
  details: contract.details,
  approvers: contract.plannedApprovers,
});

export const buildApprovalBriefingPayload = (contract: ContractLike, approvalLine: unknown) => ({
  title: contract.title,
  details: contract.details,
  approvalLine,
});
