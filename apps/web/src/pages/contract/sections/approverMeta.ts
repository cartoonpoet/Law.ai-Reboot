import type { AvatarColor } from "@lawkit/ui";
import type { Approver } from "../request-schema";

/** 결재 유형 라벨/아바타색 — 모달·레일 패널 공용 */
export const APPROVER_TYPE_LABEL: Record<Approver["type"], string> = {
  draft: "기안",
  approve: "결재",
  agree: "합의",
  refer: "참조",
};

export const APPROVER_TYPE_AVATAR: Record<Approver["type"], AvatarColor> = {
  draft: "secondary",
  approve: "primary",
  agree: "info",
  refer: "success",
};
