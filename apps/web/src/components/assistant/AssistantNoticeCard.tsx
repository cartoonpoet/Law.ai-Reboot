import type { NotificationDto } from "@lawai/contracts";
import { NotificationItem } from "../notifications/NotificationItem";
import * as css from "./aiAssistant.css";
import * as noticeCss from "./assistantNotifications.css";

interface AssistantNoticeCardProps {
  items: NotificationDto[];
  badgeLabel: string;
  onSelect: (notification: NotificationDto) => void;
  onOpenAll: () => void;
}

/** 비서 홈 맨 위 새 알림 카드 — 안 읽은 알림 몇 건 + 전체 보기(알림 화면). */
export const AssistantNoticeCard = ({ items, badgeLabel, onSelect, onOpenAll }: AssistantNoticeCardProps) => (
  <section className={css.homeCard} aria-label="새 알림">
    <div className={noticeCss.cardHead}>
      <span className={css.homeCardTitle}>
        새 알림<span className={noticeCss.countPill}>{badgeLabel}</span>
      </span>
      <button type="button" className={noticeCss.linkButton} onClick={onOpenAll}>
        전체 보기
      </button>
    </div>
    <div className={noticeCss.noticeList}>
      {items.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onSelect={onSelect} />
      ))}
    </div>
  </section>
);
