/**
 * 코멘트 역할(role) 파생 단일 출처 — P2 ff-review(응집도) 분리.
 *
 * P1까지 `CommentPanel.tsx`(라벨·variant 분기)와 `CommentItem.tsx`(아바타색·칩 클래스)
 * 두 파일에 분산돼 있던 role 매핑을 한 곳에 모은다. role 문자열(예: 신규 sealManager)이
 * 추가될 때 본 파일 1곳만 수정하면 된다.
 *
 * 칩 클래스는 시안 토큰을 갖고 있는 `commentItem.css.ts`를 import한다(스타일은 그쪽이 출처).
 */
import * as itemCss from "./commentItem.css";

/** 시안 역할 구분: 요청자/법무팀/시스템/그 외(other). */
export type RoleVariant = "requester" | "legal" | "system" | "other";

/** 작성 시점 role 스냅(Role enum 또는 레거시 한글) → 한국어 표시 라벨. */
const ROLE_LABEL: Record<string, string> = {
  general: "요청자",
  requester: "요청자",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "인감관리자",
  admin: "관리자",
  system: "시스템",
};

const LEGAL_ROLES = new Set([
  "inHouseCounsel",
  "contractManager",
  "outsideCounsel",
  "admin",
]);
const REQUESTER_ROLES = new Set(["general", "requester"]);

/** role 문자열 → 표시 라벨. 미지정 role은 원문 그대로(폴백). */
export const getRoleLabel = (role: string): string => ROLE_LABEL[role] ?? role;

/** role 문자열 → 시안 variant. 알 수 없는 role은 `other`. */
export const getRoleVariant = (role: string): RoleVariant => {
  if (role === "system") return "system";
  if (LEGAL_ROLES.has(role)) return "legal";
  if (REQUESTER_ROLES.has(role)) return "requester";
  return "other";
};

/** variant → Avatar `color` 매핑(시안 av-req/legal/sys). */
export const AVATAR_COLOR: Record<RoleVariant, "primary" | "info" | "secondary"> = {
  requester: "primary",
  legal: "info",
  system: "secondary",
  other: "secondary",
};

/** variant → 역할 칩(.roletag) 클래스 매핑. */
export const ROLE_TAG_CLASS: Record<RoleVariant, string> = {
  requester: itemCss.roleRequester,
  legal: itemCss.roleLegal,
  system: itemCss.roleSystem,
  other: itemCss.roleSystem,
};
