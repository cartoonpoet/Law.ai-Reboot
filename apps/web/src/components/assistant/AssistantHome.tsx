import { Icon } from "@lawkit/ui";
import { ASSISTANT_PROFILE, ASSISTANT_SUGGESTIONS } from "./assistantData";
import type { ChatMessage } from "./assistantData";
import * as css from "./aiAssistant.css";

interface AssistantHomeProps {
  // 로그인 사용자 이름 — 불러오기 전·실패 시 null 이면 이름 없이 인사
  userName: string | null;
  contextLabel: string;
  // 이번 대화의 마지막 메시지(대화 전이면 null)
  lastMessage: ChatMessage | null;
  onClose: () => void;
  onStartChat: () => void;
  onQuickCommand: (prompt: string) => void;
}

/** AI 비서 홈 — 인사 헤더 위에 카드가 겹쳐 올라온다(새 대화 · 추천 질문 · 이어서 대화). */
export const AssistantHome = ({ userName, contextLabel, lastMessage, onClose, onStartChat, onQuickCommand }: AssistantHomeProps) => (
  <>
    <div className={css.homeScroll}>
      <header className={css.homeHero}>
        <div className={css.heroTop}>
          <span className={css.heroBrand}>Law.ai</span>
          <button type="button" className={css.heroClose} onClick={onClose} aria-label="AI 비서 닫기">
            <Icon name="close" size="sm" />
          </button>
        </div>
        <h2 className={css.heroTitle}>
          {userName ? `안녕하세요, ${userName} 님` : "안녕하세요"}
          <br />
          무엇을 도와드릴까요?
        </h2>
      </header>

      <div className={css.homeCards}>
        <div className={css.homeCard}>
          <div className={css.operatorRow}>
            <span className={css.botAvatarLarge}>
              <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
            </span>
            <span className={css.operatorText}>
              <span className={css.operatorName}>{ASSISTANT_PROFILE.name}</span>
              <span className={css.statusText}>
                <span className={css.onlineDot} />
                {ASSISTANT_PROFILE.status} · 보고 있는 화면: {contextLabel}
              </span>
            </span>
          </div>
          <button type="button" className={css.startButton} onClick={onStartChat}>
            <Icon name="sendSolid" size="sm" className={css.startIcon} />
            {lastMessage ? "대화 이어가기" : "새 대화 시작"}
          </button>
        </div>

        <div className={css.homeCard}>
          <div className={css.homeCardTitle}>이렇게 물어보세요</div>
          <div>
            {ASSISTANT_SUGGESTIONS.map((prompt) => (
              <button key={prompt} type="button" className={css.quickRow} onClick={() => onQuickCommand(prompt)}>
                {prompt}
                <Icon name="chevronRight" size="sm" className={css.quickIcon} />
              </button>
            ))}
          </div>
        </div>

        {lastMessage && (
          <div className={css.homeCard}>
            <div className={css.homeCardTitle}>최근 대화</div>
            <button type="button" className={css.recentRow} onClick={onStartChat}>
              <span className={css.botAvatar}>
                <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
              </span>
              <span className={css.recentMain}>
                <span className={css.operatorName}>{lastMessage.role === "assistant" ? "AI 비서" : "나"}</span>
                <span className={css.recentPreview}>{lastMessage.text}</span>
              </span>
              <span className={css.recentTime}>{lastMessage.time}</span>
            </button>
          </div>
        )}
      </div>
    </div>

    <nav className={css.bottomNav} aria-label="AI 비서 메뉴">
      <button type="button" className={`${css.navButton} ${css.navActive}`} aria-current="page">
        <Icon name="autoAwesome" size="sm" />홈
      </button>
      <button type="button" className={css.navButton} onClick={onStartChat}>
        <Icon name="messageCircle" size="sm" />
        대화
      </button>
    </nav>
  </>
);
