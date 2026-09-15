import type { ContractStatus, TenantRole } from "@lawai/contracts";

// AI 비서에게 넘기는 사용자 업무 데이터 — 사용자가 볼 권한이 있는 것만 담는다.
export interface AssistantContractContext {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  dueDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  requesterName: string | null;
  // 사용자와의 관계: 담당·요청·작성, 배정 권한자에게 보이는 미배정 계약은 배정대상
  relations: string[];
}

export interface AssistantApprovalContext {
  lineId: string;
  contractId: string | null;
  title: string;
  submittedByName: string;
  step: string;
}

export interface AssistantAssignee {
  id: string;
  name: string;
  dept: string;
}

export interface AssistantContext {
  viewer: { id: string; name: string; role: TenantRole; canAssign: boolean };
  contracts: AssistantContractContext[];
  approvals: AssistantApprovalContext[];
  assignees: AssistantAssignee[];
}

// 서버 contracts.authz 에서 배정(assign) 권한이 있는 역할
export const ASSIGNER_ROLES: TenantRole[] = ["inHouseCounsel", "contractManager"];
// 계약 담당자로 배정할 수 있는 역할
export const ASSIGNEE_ROLES: TenantRole[] = ["inHouseCounsel", "contractManager", "outsideCounsel"];

// 계약 진행 중 상태(체결 완료·이행·종료 제외)
export const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = ["unassigned", "assigning", "legalReview", "requesterReview", "reviewDone", "signing"];

const ROLE_LABEL: Record<TenantRole, string> = {
  general: "일반 사용자",
  contractManager: "계약 관리자",
  inHouseCounsel: "사내 법무",
  outsideCounsel: "외부 변호사",
  sealManager: "인감 관리자",
};

const STATUS_LABEL: Partial<Record<ContractStatus, string>> = {
  unassigned: "미배정",
  assigning: "배정 중",
  legalReview: "법무 검토 중",
  requesterReview: "요청자 검토 중",
  reviewDone: "검토 완료",
  signing: "체결 진행",
};

// 대화 기록은 최근 것만 — 비용과 응답 속도, 과거 대화의 오래된 정보가 섞이는 것을 막는다.
export const MAX_HISTORY_MESSAGES = 12;

// AI 에 넘기는 데이터 — 배정 권한이 없으면 담당자 목록은 넘기지 않는다.
const toPromptData = (context: AssistantContext) => ({
  contracts: context.contracts.map((c) => ({ ...c, statusLabel: STATUS_LABEL[c.status] ?? c.status })),
  approvals: context.approvals,
  assignees: context.viewer.canAssign ? context.assignees : [],
});

// 제안 행동 규칙 — 대화·브리핑 공통.
const getActionRules = (context: AssistantContext): string[] => [
  '  - "open": 화면 열기. path 는 "/contract/{계약 id}", "/approvals/inbox", "/contract/list", "/" 중 하나. label 은 버튼 문구.',
  `  - "assign": 미배정(unassigned) 계약에 담당자 배정. ownerId 는 [데이터].assignees 의 id.${context.viewer.canAssign ? "" : " (이 사용자는 배정 권한이 없으니 제안하지 마세요)"}`,
  '  - "startReview": 배정 중(assigning)이고 사용자가 담당자(ownerId)인 계약의 검토 시작.',
];

/** 업무 데이터가 바뀌었는지 판단하는 서명 — 같으면 브리핑을 다시 만들지 않는다. */
export const getContextSignature = (context: AssistantContext): string =>
  JSON.stringify({
    canAssign: context.viewer.canAssign,
    contracts: context.contracts.map((c) => [c.id, c.status, c.dueDate, c.ownerId]),
    approvals: context.approvals.map((a) => a.lineId),
  });

/** 대시보드 AI 브리핑 시스템 지시 — 오늘 챙길 일을 급한 순으로 짧게. */
export const buildBriefSystemPrompt = (params: { context: AssistantContext; today: string }): string => {
  const { context, today } = params;
  return [
    `당신은 Law.ai 법무 업무 AI 비서입니다. 사용자는 ${context.viewer.name}(${ROLE_LABEL[context.viewer.role]})이고, 오늘은 ${today}입니다.`,
    "대시보드 맨 위에 보여줄 '오늘의 브리핑'을 만드세요.",
    "",
    "규칙:",
    "- 아래 [데이터]에 있는 계약·결재만 근거로 쓰세요. 없는 사실을 만들지 마세요.",
    "- headline: 사용자가 오늘 챙길 일을 한 문장으로(몇 건인지, 가장 급한 것이 무엇인지).",
    "- points: 사용자가 직접 처리해야 하는 일을 급한 순으로 최대 3개. 각 text 는 한두 문장으로 '왜 지금인지'와 '무엇을 하면 되는지'. 계약은 제목으로 부르세요.",
    "- tone: 기한이 지났거나 오늘이면 danger, 3일 이내이거나 오래 멈춰 있으면 warning, 그 외 info.",
    "- 한국어로, 쉬운 말로 쓰세요. 일을 실행했다고 말하지 마세요.",
    "- 각 point 의 action 은 그 일을 바로 할 수 있는 행동 하나 또는 null. 가능한 type:",
    ...getActionRules(context),
    "",
    '반드시 다음 JSON 으로만 답하세요: {"headline": string, "points": [{"tone": "danger"|"warning"|"info", "text": string, "action": {"type":"open","label":string,"path":string} | {"type":"assign","contractId":string,"ownerId":string} | {"type":"startReview","contractId":string} | null}]}',
    "",
    "[데이터]",
    JSON.stringify(toPromptData(context)),
  ].join("\n");
};

/** AI 비서 시스템 지시 — 규칙 + 응답 JSON 형식 + 사용자 업무 데이터. */
export const buildAssistantSystemPrompt = (params: { context: AssistantContext; screen: string; today: string }): string => {
  const { context, screen, today } = params;
  const data = toPromptData(context);

  return [
    `당신은 Law.ai 법무 업무 AI 비서입니다. 사용자는 ${context.viewer.name}(${ROLE_LABEL[context.viewer.role]})입니다.`,
    `오늘은 ${today}이고, 사용자가 보고 있는 화면은 "${screen}"입니다.`,
    "",
    "규칙:",
    "- 아래 [데이터]에 있는 계약·결재·담당자 정보만 근거로 답하세요. 데이터에 없는 내용은 모른다고 말하세요.",
    "- 한국어로, 쉬운 말로, 짧게 답하세요. 계약은 제목과 관리번호(code)로 부르세요.",
    "- 일을 직접 실행했다고 말하지 마세요. 실행이 필요하면 actions 에 제안만 넣으세요. 사용자가 화면에서 확인해야 실행됩니다.",
    "- 법률 판단이 필요한 질문에는 참고용이며 최종 판단은 담당 법무에게 있다고 덧붙이세요.",
    "- actions 는 최대 3개이고, 가능한 type 은 다음과 같습니다.",
    ...getActionRules(context),
    "",
    '반드시 다음 JSON 으로만 답하세요: {"reply": string, "actions": [{"type":"open","label":string,"path":string} | {"type":"assign","contractId":string,"ownerId":string} | {"type":"startReview","contractId":string}]}',
    "",
    "[데이터]",
    JSON.stringify(data),
  ].join("\n");
};
