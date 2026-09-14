import { useState } from "react";
import { Icon } from "@lawkit/ui";
import { AssistantChat } from "./AssistantChat";
import { AssistantHome } from "./AssistantHome";
import { ASSISTANT_POPUP, ASSISTANT_PROFILE } from "./mockDashboardData";
import { useAssistantChat } from "./useAssistantChat";
import * as css from "./dashboardMock.css";

interface AiAssistantDockProps {
  // 지금 사용자가 보고 있는 화면 — 비서가 맥락으로 쓴다.
  contextLabel: string;
}

type ViewTypes = "home" | "chat";

/**
 * 항상 떠 있는 AI 비서 — 채널톡 스타일.
 * 동그란 런처 + 먼저 말 거는 말풍선 → 홈(인사·새 대화·자주 시키는 일·최근 대화) → 대화(아바타·시간·빠른 답장·입력창).
 */
export const AiAssistantDock = ({ contextLabel }: AiAssistantDockProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewTypes>("home");
  const [isPopupDismissed, setIsPopupDismissed] = useState(false);
  const chat = useAssistantChat();

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
      {!isOpen && !isPopupDismissed && (
        <div className={css.popup}>
          <button type="button" className={css.popupBody} onClick={() => handleOpen("chat")}>
            <span className={css.popupHead}>
              <span className={css.botAvatar}>
                <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
              </span>
              <span className={css.popupName}>{ASSISTANT_PROFILE.name}</span>
              <span className={css.popupTime}>방금</span>
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
              contextLabel={contextLabel}
              onClose={() => setIsOpen(false)}
              onStartChat={() => handleOpen("chat")}
              onQuickCommand={handleStartWith}
            />
          ) : (
            <AssistantChat
              messages={chat.messages}
              quickReplies={chat.quickReplies}
              onSend={chat.sendMessage}
              onBack={() => setView("home")}
              onClose={() => setIsOpen(false)}
            />
          )}
        </section>
      )}

      <button
        type="button"
        className={css.launcher}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen(view))}
        aria-label={isOpen ? "AI 비서 닫기" : "AI 비서 열기"}
        aria-expanded={isOpen}
      >
        <Icon name={isOpen ? "close" : "messageCircle"} size="md" className={css.launcherIcon} />
        {!isOpen && !isPopupDismissed && <span className={css.unreadBadge}>1</span>}
      </button>
    </>
  );
};
