// kind 별 AI 분석 입력 페이로드 빌더(순수 함수). 계약 row(응답 형태) → payload 객체.
// 사전 점검·리스크는 계약서 원본(role=contract) 파일에서 뽑은 본문(fileText)을 함께 넘긴다
// (ContractTextExtractor — PDF·docx·txt). 못 읽으면 null 이고 AI 는 메타데이터만으로 판단한다.
export interface ContractLike {
  title: string;
  details: unknown;
  plannedApprovers?: unknown;
}

export const buildPrecheckPayload = (contract: ContractLike, fileText: string | null) => ({
  title: contract.title,
  details: contract.details,
  fileText,
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
