import type { NotificationDto } from "@lawai/contracts";
import * as css from "./notificationItem.css";

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

// 알림 종류 → 보낸 사람 옆 한 줄 설명. 모르는 종류는 설명 없이 보낸 사람만 보인다.
const TYPE_LABEL: Record<string, string> = {
  approval_turn: "결재 차례예요",
  approval_referred: "결재 참조",
  approval_rejected: "결재가 반려됐어요",
  approval_completed: "결재가 끝났어요",
  comment_mention: "나를 언급했어요",
  contract_expiring_90: "계약 만료 90일 전이에요",
  contract_expiring_30: "계약 만료 30일 전이에요",
  contract_expiring_7: "계약 만료가 7일 안으로 다가왔어요",
};

// 사람이 아닌 시스템 알림(만료 임박 등)은 보낸 사람 이름이 없다.
const SYSTEM_SENDER_NAME = "Law.ai";

// detail 은 Record<string, unknown> | null — 글자 값만 안전 추출(string 가드).
const getDetailText = (detail: NotificationDto["detail"], key: string): string => {
  const value = detail?.[key];
  return typeof value === "string" ? value : "";
};

/** 알림 한 건. 클릭 시 onSelect(읽음 처리·이동은 부모가 처리). */
export const NotificationItem = ({ notification, onSelect }: NotificationItemProps) => {
  // 코멘트는 본문 미리보기, 결재는 품의 제목.
  const preview = getDetailText(notification.detail, "preview") || getDetailText(notification.detail, "title");
  const typeLabel = TYPE_LABEL[notification.type];
  const itemClass = notification.isRead ? css.item : `${css.item} ${css.itemUnread}`;

  return (
    <button type="button" className={itemClass} onClick={() => onSelect(notification)}>
      <span className={css.itemTop}>
        <span className={css.actorName}>{notification.actorName || SYSTEM_SENDER_NAME}</span>
        {typeLabel ? <span className={css.typeLabel}>{typeLabel}</span> : null}
        {notification.isRead ? null : <span className={css.unreadDot} />}
      </span>
      {preview ? <span className={css.preview}>{preview}</span> : null}
      {notification.isTargetDeleted ? <span className={css.deletedNote}>삭제된 계약이에요</span> : null}
      <time className={css.time}>{formatTime(notification.createdAt)}</time>
    </button>
  );
};
