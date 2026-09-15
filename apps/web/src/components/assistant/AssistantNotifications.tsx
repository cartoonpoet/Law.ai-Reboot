import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import { getNotificationCategory } from "@lawai/contracts";
import type { NotificationCategory, NotificationDto } from "@lawai/contracts";
import { cx } from "../../pages/contract/cx";
import { NotificationItem } from "../notifications/NotificationItem";
import * as css from "./aiAssistant.css";
import * as noticeCss from "./assistantNotifications.css";

type NotificationFilterTypes = "all" | "unread" | NotificationCategory;

const EMPTY_TEXT: Record<NotificationFilterTypes, string> = {
  all: "새 알림이 없습니다.",
  unread: "안 읽은 알림이 없어요.",
  approval: "결재 알림이 없어요.",
  comment: "코멘트 알림이 없어요.",
  contract: "계약 만료 알림이 없어요.",
};

const checkFilter = (notification: NotificationDto, filter: NotificationFilterTypes): boolean => {
  if (filter === "all") return true;
  if (filter === "unread") return !notification.isRead;
  return getNotificationCategory(notification.type) === filter;
};

interface AssistantNotificationsProps {
  notifications: NotificationDto[];
  unreadCount: number;
  onSelect: (notification: NotificationDto) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  bottomNav: ReactNode;
}

/** AI 비서 알림 화면 — 모두 읽음 · 전체/안 읽음/결재/코멘트 필터 · 목록. */
export const AssistantNotifications = ({
  notifications,
  unreadCount,
  onSelect,
  onMarkAllRead,
  onClose,
  bottomNav,
}: AssistantNotificationsProps) => {
  const [filter, setFilter] = useState<NotificationFilterTypes>("all");
  const visibleNotifications = notifications.filter((notification) => checkFilter(notification, filter));

  const FILTERS: { value: NotificationFilterTypes; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "unread", label: `안 읽음 ${unreadCount}` },
    { value: "approval", label: "결재" },
    { value: "comment", label: "코멘트" },
    { value: "contract", label: "계약 만료" },
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
          <p className={noticeCss.emptyText}>{EMPTY_TEXT[filter]}</p>
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
