import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import type { NotificationDto } from "@lawai/contracts";
import { cx } from "../../pages/contract/cx";
import { NotificationItem } from "../notifications/NotificationItem";
import * as css from "./aiAssistant.css";
import * as noticeCss from "./assistantNotifications.css";

type NotificationFilterTypes = "all" | "unread";

interface AssistantNotificationsProps {
  notifications: NotificationDto[];
  unreadCount: number;
  onSelect: (notification: NotificationDto) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  bottomNav: ReactNode;
}

/** AI 비서 알림 화면 — 모두 읽음 · 전체/안 읽음 필터 · 목록. */
export const AssistantNotifications = ({
  notifications,
  unreadCount,
  onSelect,
  onMarkAllRead,
  onClose,
  bottomNav,
}: AssistantNotificationsProps) => {
  const [filter, setFilter] = useState<NotificationFilterTypes>("all");
  const visibleNotifications =
    filter === "unread" ? notifications.filter((notification) => !notification.isRead) : notifications;
  const emptyText = filter === "unread" ? "안 읽은 알림이 없어요." : "새 알림이 없습니다.";

  const FILTERS: { value: NotificationFilterTypes; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "unread", label: `안 읽음 ${unreadCount}` },
  ];

  return (
    <>
      <header className={css.chatHeader}>
        <h2 className={noticeCss.headerTitle}>알림</h2>
        <button type="button" className={noticeCss.markAllButton} disabled={unreadCount === 0} onClick={onMarkAllRead}>
          모두 읽음
        </button>
        <button type="button" className={css.iconButton} onClick={onClose} aria-label="AI 비서 닫기">
          <Icon name="close" size="sm" />
        </button>
      </header>

      <div className={noticeCss.filterRow} role="group" aria-label="알림 필터">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            className={cx(noticeCss.filterChip, filter === option.value && noticeCss.filterChipActive)}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={noticeCss.list}>
        {visibleNotifications.length === 0 ? (
          <p className={noticeCss.emptyText}>{emptyText}</p>
        ) : (
          visibleNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onSelect={onSelect} />
          ))
        )}
      </div>

      {bottomNav}
    </>
  );
};
