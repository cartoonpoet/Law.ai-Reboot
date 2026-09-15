import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import { cx } from "../../pages/contract/cx";
import { useMe } from "../layout/hooks/useMe";
import { AssistantBottomNav } from "./AssistantBottomNav";
import { AssistantChat } from "./AssistantChat";
import { AssistantHome } from "./AssistantHome";
import { AssistantNoticeCard } from "./AssistantNoticeCard";
import { AssistantNotifications } from "./AssistantNotifications";
import { ASSISTANT_POPUP, ASSISTANT_PROFILE } from "./assistantData";
import { useAssistant } from "./useAssistant";
import type { AssistantViewTypes } from "./useAssistantState";
import { useAssistantNotifications } from "./useAssistantNotifications";
import * as css from "./aiAssistant.css";

const getLauncherLabel = (isOpen: boolean, badgeLabel: string | null) => {
  if (isOpen) return "AI 비서 닫기";
  return badgeLabel ? `AI 비서 열기, 안 읽은 알림 ${badgeLabel}건` : "AI 비서 열기";
};

/**
 * 항상 떠 있는 AI 비서(채널톡 스타일) — AppShell 이 모든 화면에 띄운다.
 * 헤더 알림 종을 흡수했다: 런처 숫자 = 안 읽은 알림 수, 홈 맨 위 새 알림 카드, 하단 탭 홈 · 대화 · 알림.
 */
export const AiAssistant = () => {
  const { me } = useMe();
  const assistant = useAssistant();
  const notifications = useAssistantNotifications(assistant.close);
  const { chat, view, isOpen } = assistant;
  const hasPopup = !isOpen && !assistant.isPopupDismissed;
  const lastMessage = chat.messages.length > 1 ? (chat.messages.at(-1) ?? null) : null;

  const bottomNav = (
    <AssistantBottomNav view={view} badgeLabel={notifications.badgeLabel} onSelect={assistant.showView} />
  );

  const noticeCard =
    notifications.badgeLabel && notifications.noticeItems.length > 0 ? (
      <AssistantNoticeCard
        items={notifications.noticeItems}
        badgeLabel={notifications.badgeLabel}
        onSelect={notifications.select}
        onOpenAll={() => assistant.showView("notifications")}
      />
    ) : null;

  const panelViews: Record<AssistantViewTypes, ReactNode> = {
    home: (
      <AssistantHome
        userName={me?.name ?? null}
        contextLabel={assistant.screenLabel}
        lastMessage={lastMessage}
        noticeCard={noticeCard}
        bottomNav={bottomNav}
        onClose={assistant.close}
        onStartChat={() => assistant.open("chat")}
        onQuickCommand={assistant.ask}
      />
    ),
    chat: (
      <AssistantChat
        messages={chat.messages}
        quickReplies={chat.quickReplies}
        isReplying={chat.isReplying}
        actionStates={chat.actionStates}
        onSend={chat.sendMessage}
        onRunAction={chat.runAction}
        onDismissAction={chat.dismissAction}
        onBack={() => assistant.showView("home")}
        onClose={assistant.close}
      />
    ),
    notifications: (
      <AssistantNotifications
        notifications={notifications.notifications}
        unreadCount={notifications.unreadCount}
        onSelect={notifications.select}
        onMarkAllRead={notifications.markAllRead}
        onClose={assistant.close}
        bottomNav={bottomNav}
      />
    ),
  };

  return (
    <>
      {hasPopup && (
        <div className={css.popup}>
          <button type="button" className={css.popupBody} onClick={() => assistant.open("chat")}>
            <span className={css.popupHead}>
              <span className={css.botAvatar}>
                <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
              </span>
              <span className={css.popupName}>{ASSISTANT_PROFILE.name}</span>
            </span>
            <span className={css.popupText}>{ASSISTANT_POPUP}</span>
          </button>
          <button type="button" className={css.popupClose} onClick={assistant.dismissPopup} aria-label="말풍선 닫기">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {isOpen && (
        <section className={css.panel} aria-label="AI 비서">
          {panelViews[view]}
        </section>
      )}

      <button
        type="button"
        className={cx(css.launcher, isOpen && css.launcherOpen)}
        onClick={() => (isOpen ? assistant.close() : assistant.open(view))}
        aria-label={getLauncherLabel(isOpen, notifications.badgeLabel)}
        aria-expanded={isOpen}
      >
        <Icon name={isOpen ? "close" : "messageCircle"} size="md" className={css.launcherIcon} />
        {notifications.badgeLabel && <span className={css.unreadBadge}>{notifications.badgeLabel}</span>}
      </button>
    </>
  );
};
