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
  createdAt: string;
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
