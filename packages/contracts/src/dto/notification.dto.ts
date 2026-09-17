import type { PushNotification } from "./comment.dto";
import type { TenantContext } from "./tenant.dto";

// 인앱 알림 조회 응답. 폴리모픽(targetType/targetId)이며 detail 은 JSON(nullable).
export interface NotificationDto {
  id: string;
  // 알림 종류(예: "comment_mention"). enum 대신 string.
  type: string;
  // 알림을 유발한 actor(예: 멘션한 사용자) userId.
  actorId: string;
  // actor 표시 이름(서버가 users.User 에서 조회해 매핑).
  actorName: string;
  // 폴리모픽 대상 타입(예: "Comment").
  targetType: string;
  // 폴리모픽 대상 id.
  targetId: string;
  // 부가 정보 JSON(예: { contractId, preview }). 없으면 null.
  detail: Record<string, unknown> | null;
  // 읽음 여부. 서버에서 readAt != null 로 파생.
  isRead: boolean;
  // detail.contractId 가 가리키는 계약이 삭제됐는지. 삭제된 계약 알림은 눌러도 이동하지 않는다.
  isTargetDeleted: boolean;
  createdAt: string;
}

// 알림 묶음 — 사용자가 종류별로 끄고 켜거나 알림 화면에서 걸러 보는 단위.
export type NotificationCategory = "approval" | "comment" | "contract";

// 알림이 가리키는 계약 id. 코멘트 알림은 detail.contractId, 결재 알림은 대상이 계약일 때 detail.targetId.
export const getNotificationContractId = (detail: Record<string, unknown> | null): string | null => {
  if (typeof detail?.contractId === "string") return detail.contractId;
  if (detail?.targetType === "contract" && typeof detail.targetId === "string") return detail.targetId;
  return null;
};

// 알림 detail → 법률자문 id(자문 요청·회신 결재 알림). 자문 알림이 아니면 null.
export const getNotificationAdviceId = (detail: Record<string, unknown> | null): string | null => {
  const isAdviceTarget = detail?.targetType === "advice_request" || detail?.targetType === "advice_answer";
  return isAdviceTarget && typeof detail?.targetId === "string" ? detail.targetId : null;
};

// 알림 type("approval_turn", "comment_mention" 등) → 묶음. 어느 묶음에도 속하지 않으면 null(항상 받음).
export const getNotificationCategory = (type: string): NotificationCategory | null => {
  if (type.startsWith("approval_")) return "approval";
  if (type.startsWith("comment_")) return "comment";
  if (type.startsWith("contract_")) return "contract";
  return null;
};

// 계약 만료 임박 알림 실행 결과 — 게이트웨이가 받은 알림을 실시간(SSE)으로 밀어준다.
export interface RunContractExpiryAlertsResult {
  notifications: PushNotification[];
}

// 알림 목록 조회 응답. unreadCount 로 배지를 한 번에 갱신한다.
export interface ListNotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}

// 알림 목록 조회. viewerId 는 gateway 가 JWT sub 를 주입(본인 알림만).
export interface ListNotificationsRequest {
  viewerId?: string;
  limit?: number;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 단건 읽음 처리. 본인 알림만 가능(서버가 viewerId 로 판정).
export interface MarkNotificationReadRequest {
  id: string;
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 전체 읽음 처리. 본인 알림 전체(서버가 viewerId 로 판정).
export interface MarkAllNotificationsReadRequest {
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}
