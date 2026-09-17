import type { AdvicePermissions, AdviceStatusTypes, TenantRole } from "@lawai/contracts";

/**
 * 법률자문 권한 — 계약 권한(contracts.authz)과 같은 역할 구분을 쓴다.
 * - 법무팀(사내 변호사·계약 관리자, 시스템 관리자 포함): 회사 안 자문 전체를 보고 담당을 배정한다.
 * - 외부 변호사: 자기가 담당한 자문만 본다.
 * - 그 외: 자기가 요청·작성했거나 참조로 지정된 자문만 본다.
 * 질의·회신은 담당자, 답변·종결은 요청자 쪽이 한다.
 */

export interface AdviceViewer {
  id: string;
  role: TenantRole;
}

export interface AdviceAuthzTarget {
  status: AdviceStatusTypes;
  requesterId: string;
  createdById: string;
  ownerId: string | null;
  ccUserIds: string[];
}

const LEGAL_ROLES: ReadonlySet<TenantRole> = new Set<TenantRole>(["inHouseCounsel", "contractManager"]);
// 담당자로 지정할 수 있는 역할.
const OWNER_ROLES: ReadonlySet<TenantRole> = new Set<TenantRole>([
  "inHouseCounsel",
  "contractManager",
  "outsideCounsel",
]);

const OPEN_STATUSES: ReadonlySet<AdviceStatusTypes> = new Set<AdviceStatusTypes>(["received", "reviewing", "waitingRequester"]);
const IN_REVIEW_STATUSES: ReadonlySet<AdviceStatusTypes> = new Set<AdviceStatusTypes>(["reviewing", "waitingRequester"]);
// 요청자가 말을 보탤 수 있는 상태 — 회신 뒤에 다시 물으면 검토로 돌아간다.
const REPLYABLE_STATUSES: ReadonlySet<AdviceStatusTypes> = new Set<AdviceStatusTypes>([
  "reviewing",
  "waitingRequester",
  "answered",
]);

export const checkLegalRole = (role: TenantRole): boolean => LEGAL_ROLES.has(role);

export const checkOwnerRole = (role: TenantRole): boolean => OWNER_ROLES.has(role);

const checkRequesterSide = (viewer: AdviceViewer, target: AdviceAuthzTarget): boolean =>
  viewer.id === target.requesterId || viewer.id === target.createdById;

export const checkCanView = (viewer: AdviceViewer, target: AdviceAuthzTarget): boolean => {
  if (checkLegalRole(viewer.role)) return true;
  if (viewer.id === target.ownerId) return true;
  if (viewer.role === "outsideCounsel") return false;
  return checkRequesterSide(viewer, target) || target.ccUserIds.includes(viewer.id);
};

// 비밀 참조수신자 목록을 볼 수 있는지 — 법무팀과 작성자만.
export const checkCanSeeSecretCc = (viewer: AdviceViewer, target: AdviceAuthzTarget): boolean =>
  checkLegalRole(viewer.role) || viewer.id === target.createdById;

export const getAdvicePermissions = (viewer: AdviceViewer, target: AdviceAuthzTarget): AdvicePermissions => {
  const isOwner = viewer.id === target.ownerId;
  const isRequesterSide = checkRequesterSide(viewer, target);
  return {
    canAssign: checkLegalRole(viewer.role) && OPEN_STATUSES.has(target.status),
    canFollowup: isOwner && IN_REVIEW_STATUSES.has(target.status),
    canAnswer: isOwner && IN_REVIEW_STATUSES.has(target.status),
    canReply: isRequesterSide && REPLYABLE_STATUSES.has(target.status),
    canClose: (isRequesterSide || isOwner) && target.status === "answered",
  };
};
