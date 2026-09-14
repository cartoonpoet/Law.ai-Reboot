import type { ApprovalInboxItem, ContractStatus, ContractSummary } from "@lawai/contracts";
import { getActiveAiKind } from "../contract/getActiveAiKind";
import { getStatusLabel } from "../contract/contractStatus";
import type { TodoItem } from "./dashboardTypes";
import { getDaysLeft } from "./getDaysLeft";

export interface TodoViewer {
  id: string;
  // 미배정 계약에 담당자를 배정할 수 있는지(사내 법무·계약 관리자·시스템 관리자)
  canAssign: boolean;
}

const isOwner = (c: ContractSummary, viewer: TodoViewer) => c.ownerId === viewer.id;
const isRequester = (c: ContractSummary, viewer: TodoViewer) => c.requesterId === viewer.id || c.createdById === viewer.id;

// 계약 상태별로 "누가 무엇을 해야 하는지". 서버 권한 규칙(contracts.authz)과 같은 기준.
const CONTRACT_TODO_RULES: Partial<Record<ContractStatus, { action: string; isMine: (c: ContractSummary, viewer: TodoViewer) => boolean }>> = {
  unassigned: { action: "담당자 배정", isMine: (_, viewer) => viewer.canAssign },
  assigning: { action: "검토 시작", isMine: isOwner },
  legalReview: { action: "법무 검토", isMine: isOwner },
  requesterReview: { action: "검토 의견 확인", isMine: isRequester },
  reviewDone: { action: "체결 품의 상신", isMine: isRequester },
};

// 기한이 있는 일을 가까운 순으로 먼저, 기한이 없는 일은 뒤로.
const compareTodos = (a: TodoItem, b: TodoItem) => {
  if (a.daysLeft === null) return b.daysLeft === null ? 0 : 1;
  if (b.daysLeft === null) return -1;
  return a.daysLeft - b.daysLeft;
};

/** 진행 중 계약 + 내 차례 결재 → 내가 처리할 일 목록(기한순). */
export const buildTodos = (params: {
  contracts: ContractSummary[];
  approvals: ApprovalInboxItem[];
  viewer: TodoViewer;
  now: Date;
}): TodoItem[] => {
  const { contracts, approvals, viewer, now } = params;

  const contractTodos = contracts.flatMap((c): TodoItem[] => {
    const rule = CONTRACT_TODO_RULES[c.status];
    if (!rule || !rule.isMine(c, viewer)) return [];
    const aiKind = getActiveAiKind(c.status);
    return [
      {
        key: `contract-${c.id}`,
        type: "계약",
        code: c.code,
        title: c.title,
        status: getStatusLabel(c.status),
        action: rule.action,
        daysLeft: getDaysLeft(c.dueDate, now),
        path: `/contract/${c.id}`,
        aiTarget: aiKind ? { contractId: c.id, kind: aiKind } : null,
      },
    ];
  });

  const approvalTodos = approvals.map(
    (a): TodoItem => ({
      key: `approval-${a.lineId}`,
      type: "결재",
      code: null,
      title: a.title,
      status: `${a.myStepOrder + 1}/${a.totalSteps}단계 · ${a.submittedByName}`,
      action: "결재하기",
      daysLeft: null,
      path: "/approvals/inbox",
      // 계약 체결 품의는 상신 시 결재자용 AI 브리핑(approvalBriefing)이 만들어진다.
      aiTarget: a.targetType === "contract" ? { contractId: a.targetId, kind: "approvalBriefing" } : null,
    }),
  );

  return [...contractTodos, ...approvalTodos].toSorted(compareTodos);
};
