import { useNavigate } from "react-router-dom";
import type { NotificationDto } from "@lawai/contracts";
import { showToast } from "../../lib/toast/toastStore";
import { useNotifications } from "../layout/hooks/useNotifications";
import { useNotificationStream } from "../layout/hooks/useNotificationStream";
import { getUnreadBadgeLabel } from "./getUnreadBadgeLabel";

// 비서 홈 알림 카드에 보여줄 안 읽은 알림 수.
const NOTICE_CARD_LIMIT = 3;

// detail 에서 이동 대상 contractId 안전 추출(string 가드).
const getContractId = (detail: NotificationDto["detail"]): string | null => {
  const contractId = detail?.contractId;
  return typeof contractId === "string" ? contractId : null;
};

/**
 * AI 비서의 알림 — 목록·안 읽은 수·배지 문구·홈 카드용 안 읽은 알림과 알림 선택 처리.
 * 비서는 모든 화면에 항상 떠 있으므로 실시간 구독(SSE)도 여기서 한 번 연결한다.
 */
export const useAssistantNotifications = (onNavigate: () => void) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  useNotificationStream();

  // 읽음 처리는 낙관적(fire-and-forget) — 실패해도 이동을 막지 않는다.
  // 삭제된 계약 알림은 읽음 처리만 하고, 없는 화면으로 보내는 대신 안내한다.
  const select = (notification: NotificationDto) => {
    void markRead(notification.id);
    const contractId = getContractId(notification.detail);
    if (!contractId) return;
    if (notification.isTargetDeleted) {
      showToast({ intent: "info", title: "삭제된 계약이라 열 수 없어요" });
      return;
    }
    onNavigate();
    navigate(`/contract/${contractId}`);
  };

  return {
    notifications,
    unreadCount,
    badgeLabel: unreadCount > 0 ? getUnreadBadgeLabel(unreadCount) : null,
    noticeItems: notifications.filter((notification) => !notification.isRead).slice(0, NOTICE_CARD_LIMIT),
    select,
    markAllRead: () => void markAllRead(),
  };
};
