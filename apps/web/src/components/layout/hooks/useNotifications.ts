import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/notifications";

// 알림 쿼리 키. 다른 도메인(useComments 등)에서 invalidate 시 재사용하도록 export.
export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
const NOTIFICATIONS_LIMIT = 20;
const POLL_INTERVAL_MS = 60_000;

// 본인 알림 목록 + 안읽음 카운트 조회(60초 폴링) + 읽음 처리.
// 폴링은 react-query refetchInterval 옵션(useEffect 아님).
export const useNotifications = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => listNotifications(NOTIFICATIONS_LIMIT),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  // unreadCount/notifications 는 렌더 중 파생(useMemo 미사용).
  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    // markRead/markAllRead 는 Promise 반환(호출부가 await 또는 의도적 void 선택 가능).
    markRead: (id: string): Promise<void> => markReadMutation.mutateAsync(id),
    markAllRead: (): Promise<void> => markAllReadMutation.mutateAsync(),
  };
};
