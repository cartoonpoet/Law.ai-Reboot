import { useState } from "react";
import { Icon } from "@lawkit/ui";
import { useLocation } from "react-router-dom";
import { cx } from "../../pages/contract/cx";
import { useMe } from "../layout/hooks/useMe";
import { AssistantChat } from "./AssistantChat";
import { AssistantHome } from "./AssistantHome";
import { ASSISTANT_POPUP, ASSISTANT_PROFILE } from "./assistantData";
import { getScreenLabel } from "./getScreenLabel";
import { useAssistantChat } from "./useAssistantChat";
import * as css from "./aiAssistant.css";

type ViewTypes = "home" | "chat";

/**
 * 항상 떠 있는 AI 비서(채널톡 스타일) — AppShell 이 모든 화면에 띄운다.
 * 동그란 런처 + 먼저 말 거는 말풍선 → 홈(인사·추천 질문·이어서 대화) → 대화(실제 AI 답변·실행 전 확인).
 */
export const AiAssistant = () => {
  const { pathname } = useLocation();
  const { me } = useMe();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewTypes>("home");
  const [isPopupDismissed, setIsPopupDismissed] = useState(false);
  const screenLabel = getScreenLabel(pathname);
  const chat = useAssistantChat(screenLabel);
  const hasPopup = !isOpen && !isPopupDismissed;
  const lastMessage = chat.messages.length > 1 ? (chat.messages.at(-1) ?? null) : null;

  const handleOpen = (nextView: ViewTypes) => {
    setView(nextView);
    setIsOpen(true);
    setIsPopupDismissed(true);
  };

  const handleStartWith = (prompt: string) => {
    chat.sendMessage(prompt);
    handleOpen("chat");
  };

  return (
    <>
      {hasPopup && (
        <div className={css.popup}>
          <button type="button" className={css.popupBody} onClick={() => handleOpen("chat")}>
            <span className={css.popupHead}>
              <span className={css.botAvatar}>
                <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
              </span>
              <span className={css.popupName}>{ASSISTANT_PROFILE.name}</span>
            </span>
            <span className={css.popupText}>{ASSISTANT_POPUP}</span>
          </button>
          <button type="button" className={css.popupClose} onClick={() => setIsPopupDismissed(true)} aria-label="말풍선 닫기">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {isOpen && (
        <section className={css.panel} aria-label="AI 비서">
          {view === "home" ? (
            <AssistantHome
              userName={me?.name ?? null}
              contextLabel={screenLabel}
              lastMessage={lastMessage}
              onClose={() => setIsOpen(false)}
              onStartChat={() => handleOpen("chat")}
              onQuickCommand={handleStartWith}
            />
          ) : (
            <AssistantChat
              messages={chat.messages}
              quickReplies={chat.quickReplies}
              isReplying={chat.isReplying}
              actionStates={chat.actionStates}
              onSend={chat.sendMessage}
              onRunAction={chat.runAction}
              onDismissAction={chat.dismissAction}
              onBack={() => setView("home")}
              onClose={() => setIsOpen(false)}
            />
          )}
        </section>
      )}

      <button
        type="button"
        className={cx(css.launcher, isOpen && css.launcherOpen)}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen(view))}
        aria-label={isOpen ? "AI 비서 닫기" : "AI 비서 열기"}
        aria-expanded={isOpen}
      >
        <Icon name={isOpen ? "close" : "messageCircle"} size="md" className={css.launcherIcon} />
        {hasPopup && <span className={css.unreadBadge}>1</span>}
      </button>
    </>
  );
};
