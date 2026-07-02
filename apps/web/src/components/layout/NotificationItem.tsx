import type { NotificationDto } from "@lawai/contracts";
import * as css from "./notificationBell.css";

interface NotificationItemProps {
  notification: NotificationDto;
  onSelect: (notification: NotificationDto) => void;
}

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// detail 은 Record<string, unknown> | null — preview 만 안전 추출(string 가드).
const getPreview = (detail: NotificationDto["detail"]): string => {
  const preview = detail?.preview;
  return typeof preview === "string" ? preview : "";
};

/** 알림 단건 항목. 클릭 시 onSelect(navigate + markRead 는 부모가 처리). */
export function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  const preview = getPreview(notification.detail);
  const itemClass = notification.isRead
    ? css.item
    : `${css.item} ${css.itemUnread}`;

  return (
    <button
      type="button"
      className={itemClass}
      onClick={() => onSelect(notification)}
    >
      <span className={css.itemTop}>
        <span className={css.actorName}>{notification.actorName}</span>
        {notification.isRead ? null : <span className={css.unreadDot} />}
      </span>
      {preview ? <span className={css.preview}>{preview}</span> : null}
      <time className={css.time}>{formatTime(notification.createdAt)}</time>
    </button>
  );
}
