import type { ListNotificationsResponse } from "@lawai/contracts";
import { apiFetch } from "./client";

// 본인 알림 목록 + 안읽음 카운트 조회. viewerId 는 gateway 가 JWT sub 로 주입.
// limit 미지정 시 서버 기본 20.
export function listNotifications(
  limit?: number,
): Promise<ListNotificationsResponse> {
  return apiFetch<ListNotificationsResponse>(
    `/notifications${limit ? `?limit=${limit}` : ""}`,
  );
}

// 단건 읽음 처리(본인 알림만, 바디 없음). 타인 알림이면 서버가 0건 처리.
export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

// 본인 알림 전체 읽음 처리(바디 없음).
export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "PATCH" });
}
