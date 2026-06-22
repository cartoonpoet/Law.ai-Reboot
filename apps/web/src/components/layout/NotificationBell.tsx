import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { NotificationDto } from "@lawai/contracts";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import * as css from "./notificationBell.css";

const MAX_BADGE_COUNT = 99;

// detail 에서 이동 대상 contractId 안전 추출(string 가드).
const getContractId = (detail: NotificationDto["detail"]): string | null => {
  const contractId = detail?.contractId;
  return typeof contractId === "string" ? contractId : null;
};

/**
 * TopBar 알림 벨. 안읽음 배지 + 클릭 시 드롭다운(선언적 open 상태).
 * 외부 클릭은 투명 backdrop onClick 으로 닫는다(useRef/useEffect 미사용).
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const badgeLabel =
    unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  // 읽음 처리는 낙관적(fire-and-forget) — 실패해도 탐색을 막지 않는다.
  const handleSelect = (notification: NotificationDto) => {
    const contractId = getContractId(notification.detail);
    setIsOpen(false);
    void markRead(notification.id);
    if (contractId) navigate(`/contract/${contractId}`);
  };

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.bellButton}
        aria-label="알림"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Icon name="bell" size="sm" />
        {unreadCount > 0 ? (
          <span className={css.unreadBadge}>{badgeLabel}</span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className={css.backdrop}
            aria-label="알림 닫기"
            onClick={() => setIsOpen(false)}
          />
          <div className={css.panel}>
            <header className={css.panelHeader}>
              <span className={css.panelTitle}>알림</span>
              <button
                type="button"
                className={css.markAllButton}
                disabled={unreadCount === 0}
                onClick={() => void markAllRead()}
              >
                모두 읽음
              </button>
            </header>

            <div className={css.list}>
              {notifications.length === 0 ? (
                <p className={css.empty}>새 알림이 없습니다.</p>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
