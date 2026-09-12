import type { TenantRole, ContractStatus, SecurityLevel } from "@lawai/contracts";

/**
 * 중앙 RBAC 정책 모듈 — 계약 도메인의 역할 기반 인가를 한 곳에 격리한다.
 *
 * 설계 의도:
 * - 역할 → 접근범위(view/edit/assign/transition/delete) 매핑을 service 곳곳에 if-분기로
 *   흩뿌리지 않고, 이 파일 하나의 선언적 정책 테이블(ROLE_POLICY)로만 둔다.
 * - service(get/update/updateStatus)는 evaluate() 결과(boolean)만 소비하고, 도메인
 *   if-by-role 분기를 두지 않는다. 마스킹/비밀참조 필터도 maskSecret 결과로 구동한다.
 *
 * 테넌트 가변성 (필수 인지):
 * - 아래 매트릭스는 "법무팀이 전체 계약을 본다"는 일반 가정을 둔 MVP 기본값(1벌)이다.
 * - inHouseCounsel · contractManager 의 "전체 view" 범위는 고객사(테넌트)마다 좁혀질 수
 *   있다(예: 부서 단위로 한정). 그런 변형은 이 정책 데이터(ROLE_POLICY)와 scope 평가만
 *   교체하면 되도록, 정책 "데이터"와 "평가 로직"을 분리해 둔다.
 * - 향후 DB/설정으로 정책을 외부화할 때 evaluate 의 입력 인터페이스(AuthzViewer/
 *   AuthzContract)는 그대로 두고 ROLE_POLICY 만 외부 소스로 대체할 수 있게 설계했다.
 */

// 평가에 필요한 조회자(viewer) 최소 정보. role 은 JWT 가 아니라 user-service DB 에서 조회.
// TenantRole 을 사용한다: admin 조회자는 loadViewer 에서 "inHouseCounsel" 로 매핑해 이 인터페이스에 진입.
export interface AuthzViewer {
  id: string;
  role: TenantRole;
  departmentId: string | null;
}

/**
 * 평가에 필요한 계약(contract) 최소 정보. contractInclude row 에서 추출한다.
 * - ownerId 는 nullable(미배정 상태 존재). requesterId 도 nullable.
 * - ccUserIds: 참조수신자(references) 중 ccType==="user" 인 것들의 refId 배열.
 *   "본인관련" 판정(general)에 사용. service 가 row.references 에서 추출해 넣는다.
 */
export interface AuthzContract {
  createdById: string;
  ownerId: string | null;
  requesterId?: string | null;
  ccUserIds?: string[];
  status: ContractStatus;
  securityLevel: SecurityLevel;
  departmentId?: string | null;
}

// evaluate 결과. canView=false 면 나머지 액션도 전부 false 로 강제된다.
export interface AuthzResult {
  canView: boolean;
  canEdit: boolean;
  canAssign: boolean;
  canTransition: boolean;
  canDelete: boolean;
  // true 면 비밀참조(isSecret) 숨김 + 상대회사 PII 마스킹(get 에서 사용).
  maskSecret: boolean;
}

/**
 * view 범위 종류(선언적). 각 역할이 "어떤 계약을 볼 수 있는가"를 데이터로 표현한다.
 * - all        : 전체(법무팀/관리자 가정)
 * - owned      : 자신이 담당(owner)인 건만
 * - related    : 본인 관련(createdBy/owner/requester/cc 중 하나)
 * - signing    : signing 단계 계약만(인감관리자)
 */
type ViewScope = "all" | "owned" | "related" | "signing";

interface RolePolicy {
  view: ViewScope;
  // 아래 액션들은 "역할상 허용되는가"의 1차 게이트. 실제 대상 한정(owner 일치 등)은
  // requiresOwner 로, 추가 from→to 전이맵 제약은 service(ALLOWED_TRANSITIONS)가 적용.
  edit: boolean;
  assign: boolean;
  transition: boolean;
  delete: boolean;
  // edit/assign/transition 이 "담당(owner) 건"으로 한정되는지. true 면 viewer.id===ownerId 필요.
  requiresOwner: boolean;
}

/**
 * 5역할(TenantRole) × 5액션 정책 매트릭스 (01-clarify / 03-phases 표 기준).
 *
 * | 역할             | view    | edit | assign | transition | delete |
 * |-----------------|---------|------|--------|------------|--------|
 * | inHouseCounsel  | 전체*   | 담당 | 담당   | 담당(전이맵)| X      |
 * | contractManager | 전체*   | 담당 | 담당   | 담당(전이맵)| X      |
 * | outsideCounsel  | 배정(owner)만 | 배정 | X | 배정(전이맵)| X      |
 * | general         | 본인관련만 | X  | X      | X          | X      |
 * | sealManager     | signing 단계 | X | X    | signing→signed만 | X |
 *
 * * inHouseCounsel·contractManager 의 "전체 view"는 법무팀 가정 기본값(테넌트 가변).
 *
 * admin 조회자(isSystemAdmin=true)는 loadViewer 에서 "inHouseCounsel" 로 매핑되어 진입하므로
 * ROLE_POLICY 에 "admin" 키가 없어도 전체 view 권한을 얻는다. delete 는 service 레이어에서 관리.
 */
const ROLE_POLICY: Record<TenantRole, RolePolicy> = {
  inHouseCounsel: {
    view: "all",
    edit: true,
    assign: true,
    transition: true,
    delete: false,
    requiresOwner: true, // 담당(owner) 건으로 한정
  },
  contractManager: {
    view: "all",
    edit: true,
    assign: true,
    transition: true,
    delete: false,
    requiresOwner: true,
  },
  outsideCounsel: {
    view: "owned", // 배정된(owner) 건만 열람
    edit: true,
    assign: false, // 배정 권한 없음
    transition: true,
    delete: false,
    requiresOwner: true,
  },
  general: {
    view: "related", // 본인 관련(createdBy/owner/requester/cc)만
    edit: false,
    assign: false,
    transition: false,
    delete: false,
    requiresOwner: false,
  },
  sealManager: {
    view: "signing", // signing 단계 계약만
    edit: false,
    assign: false,
    transition: true, // 단, signing→signed 만(아래 evaluate 의 특수 처리 참조)
    delete: false,
    requiresOwner: false,
  },
};

// 원문(비밀참조·상대회사 PII) 열람 특권 역할. 이 역할이거나 owner/creator 면 maskSecret=false.
// admin 은 loadViewer 에서 inHouseCounsel 로 매핑되므로 별도 키 불필요.
const SECRET_PRIVILEGED_ROLES: ReadonlySet<TenantRole> = new Set<TenantRole>([
  "inHouseCounsel",
  "contractManager",
]);

/**
 * 계약 "관련자" userId 집합을 산출하는 순수 함수.
 *
 * - createdById / ownerId / requesterId / ccUserIds(user 참조) 중 존재하는 것들을
 *   중복 제거(dedupe)·falsy(null/undefined) 제거해 배열로 반환한다.
 * - isRelated 는 단일 viewer 의 boolean 판정인 반면, 이 함수는 멘션 대상 검증·후보
 *   산출에 쓸 "목록"을 제공한다(코멘트 멘션은 계약 관련자로만 제한).
 */
export const listRelatedUserIds = (contract: AuthzContract): string[] => {
  const candidates = [
    contract.createdById,
    contract.ownerId,
    contract.requesterId,
    ...(contract.ccUserIds ?? []),
  ];
  return Array.from(
    new Set(candidates.filter((id): id is string => Boolean(id))),
  );
};

// viewer 가 계약과 "본인 관련"인지(createdBy/owner/requester/cc 중 하나).
const isRelated = (viewer: AuthzViewer, contract: AuthzContract): boolean =>
  viewer.id === contract.createdById ||
  viewer.id === contract.ownerId ||
  viewer.id === contract.requesterId ||
  (contract.ccUserIds?.includes(viewer.id) ?? false);

// view 범위(scope)에 따른 열람 가능 여부 — 선언적 매핑.
const canViewByScope = (
  scope: ViewScope,
  viewer: AuthzViewer,
  contract: AuthzContract,
): boolean => {
  switch (scope) {
    case "all":
      return true;
    case "owned":
      return viewer.id === contract.ownerId;
    case "related":
      return isRelated(viewer, contract);
    case "signing":
      return contract.status === "signing";
  }
};

/**
 * 순수 함수: viewer(역할 포함) + contract(관계/상태/보안등급) → 가능 액션 집합.
 *
 * - viewer 가 null(비인증/미상) 이면 모두 false + maskSecret=true (안전 기본).
 * - canView 가 false 면 나머지 액션도 전부 false 로 강제(접근 자체 불가).
 * - transition 은 여기서 "역할상 전이 가능"만 판정(boolean). 실제 from→to 제약은
 *   service 의 ALLOWED_TRANSITIONS 로 추가 적용한다(이 모듈은 전이맵을 모른다).
 *   ★ 단, sealManager 는 예외: signing→signed 전이만 허용되므로 canTransition 을
 *     "현재 status 가 signing 일 때만 true"로 한정한다(아래 특수 처리).
 */
export const evaluate = (
  viewer: AuthzViewer | null,
  contract: AuthzContract,
): AuthzResult => {
  // 비인증/미상: 모든 액션 불가, 안전을 위해 마스킹.
  if (!viewer) {
    return {
      canView: false,
      canEdit: false,
      canAssign: false,
      canTransition: false,
      canDelete: false,
      maskSecret: true,
    };
  }

  const policy = ROLE_POLICY[viewer.role];
  const canView = canViewByScope(policy.view, viewer, contract);

  // maskSecret: 원문 열람 특권(특권 역할 또는 owner/creator)이면 false, 그 외 true.
  const isPrivileged =
    SECRET_PRIVILEGED_ROLES.has(viewer.role) ||
    viewer.id === contract.createdById ||
    viewer.id === contract.ownerId;
  const maskSecret = !isPrivileged;

  // 열람 불가면 쓰기/배정/전이/삭제도 전부 불가.
  if (!canView) {
    return {
      canView: false,
      canEdit: false,
      canAssign: false,
      canTransition: false,
      canDelete: false,
      maskSecret,
    };
  }

  // 담당(owner) 한정 역할은 viewer.id === ownerId 일 때만 쓰기/배정/전이 허용.
  const ownerOk = !policy.requiresOwner || viewer.id === contract.ownerId;

  // 미배정(ownerId null) 계약은 assign 권한 역할이 픽업 가능 — requiresOwner 면제.
  // 이미 배정된 건은 담당자만(ownerOk). canAssign 한정이라 edit/transition 은 영향 없음.
  const canAssign =
    policy.assign && (contract.ownerId === null ? true : ownerOk);

  // 미배정(ownerId null) 계약은 생성자 본인만 편집 가능 — canAssign 과 같은 모양의 완화다.
  // 신규 작성 2단계 제출 흐름(계약 생성 → 파일 업로드 → PATCH 로 반영)에서, 담당자가
  // 아직 배정되지 않은 그 짧은 구간에도 생성자 본인은 자기가 막 만든 계약을 편집(파일 반영)
  // 할 수 있어야 하기 때문이다. 담당자가 배정되는 순간부터는 이 완화가 사라지고 원래
  // 규칙(ownerOk, 담당자만)으로 즉시 돌아간다 — "생성자면 언제나 편집 가능"이 아니다.
  // canAssign/canTransition/canDelete 는 이 완화의 영향을 받지 않는다(ownerOk 그대로 사용).
  const canEditUnassigned =
    contract.ownerId === null && viewer.id === contract.createdById;

  // sealManager 특수: 역할상 transition=true 이지만 signing 단계에서만(→signed) 가능.
  const isSealManager = viewer.role === "sealManager";
  const canTransition = isSealManager
    ? contract.status === "signing"
    : policy.transition && ownerOk;

  return {
    canView: true,
    canEdit: policy.edit && (ownerOk || canEditUnassigned),
    canAssign,
    canTransition,
    canDelete: policy.delete, // delete 는 admin 전용(requiresOwner 무관)
    maskSecret,
  };
};
