// 계약 상태 전이·단계 규칙 상수(순수). 서비스들이 함께 쓴다.
import type { ContractStage, ContractStatus, TerminationReason } from "@lawai/contracts";

// 중도 해지할 수 있는 상태 — 체결 이후 아직 끝나지 않은 계약.
export const TERMINABLE_STATUSES: ContractStatus[] = ["signed", "fulfilling"];

// 원 계약이 반드시 있어야 하는 계약 단계(변경은 선택).
export const ORIGIN_REQUIRED_STAGES: ReadonlySet<ContractStage> = new Set<ContractStage>(["renew", "terminate"]);

// 파생 계약이 체결되면 원 계약을 닫는 사유와 메모 이름. 변경 계약은 원 계약을 닫지 않는다.
export const ORIGIN_CLOSE_BY_STAGE: Partial<Record<ContractStage, { reason: "renewed" | "terminated"; label: string }>> = {
  renew: { reason: "renewed", label: "갱신" },
  terminate: { reason: "terminated", label: "해지" },
};

// 중도 해지 사유 → 종료 메모 앞에 붙는 이름.
export const TERMINATION_REASON_LABEL: Record<TerminationReason, string> = {
  agreement: "합의 해지",
  counterpartyBreach: "상대방 귀책",
  ourCircumstance: "당사 사정",
  other: "기타",
};

// 상태 전이 허용 맵(from → 허용 to[]).
export const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["unassigned"],
  unassigned: ["assigning", "legalReview"],
  assigning: ["legalReview"],
  legalReview: ["requesterReview", "reviewDone"],
  requesterReview: ["legalReview", "reviewDone"],
  // reviewDone → signing 은 이 맵에 두지 않는다 — signing 진입은 submitApproval() 전용이다
  // (결재 라인을 새로 만들면서 전이). 여기 두면 "signing 에서 승인된 라인 → reviewDone 으로
  // 되돌림 → 계약서 교체 → 상태 엔드포인트로 signing 복귀" 로 옛 승인을 다른 문서에 재사용해
  // completeSigning 을 통과시킬 수 있다(completeSigning 은 최신 라인만 본다).
  reviewDone: ["legalReview"],
  signing: ["signed", "reviewDone"],
  signed: ["fulfilling"],
  fulfilling: ["closed"],
  closed: [],
};

// 계약서 파일 교체 시 risk 재분석을 다시 돌릴 상태(spec §6). 법무 검토 루프 안에 있는
// 두 상태 — 이 구간에서는 첨부된 문서가 곧 검토 대상이라 문서가 바뀌면 기존 분석이 무효다.
// (requesterReview 는 legalReview 로 되돌아갈 수 있는 같은 루프의 반대편이다.)
export const RISK_RECHECK_STATUSES: ContractStatus[] = ["legalReview", "requesterReview"];

// 계약서 파일이 붙거나 바뀔 때 사전 점검(precheck)을 돌릴 상태 — 화면(getActiveAiKind)이
// 사전 점검을 보여주는 검토 전 단계와 같다.
export const PRECHECK_STATUSES: ContractStatus[] = ["draft", "unassigned"];

// list() 2단 상태 필터 검증용 — ALLOWED_TRANSITIONS 키가 전체 ContractStatus 를 이미 망라한다.
export const VALID_STATUSES = new Set<string>(Object.keys(ALLOWED_TRANSITIONS));

// 만료는 "체결 이후"에만 의미가 있다(옛 "체결계약 만료 현황" 메뉴를 흡수) — 검토 중인 계약은
// 만료 축 자체가 없다. status/statuses 로 이미 좁혀둔 값과 교집합하고, 아무 상태 필터가
// 없으면 이 셋 전체로 좁힌다.
export const POST_SIGN_STATUSES: ContractStatus[] = ["signed", "fulfilling", "closed"];
