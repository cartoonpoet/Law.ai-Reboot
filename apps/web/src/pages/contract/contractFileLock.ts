import type { ContractStatus } from "@lawai/contracts";

// 체결 결재가 시작된(signing) 뒤로는 결재·서명 대상 문서를 바꿀 수 없다 — 서버(contract-file-lock)와 같은 규칙.
// 계약서는 읽기 전용, 첨부·참고서류는 추가만 된다. 법무 검토 중에는 잠그지 않는다.
const FILE_LOCKED_STATUSES: readonly ContractStatus[] = ["signing", "signed", "fulfilling", "closed"];

export const checkFileLocked = (status: ContractStatus): boolean =>
  FILE_LOCKED_STATUSES.includes(status);
