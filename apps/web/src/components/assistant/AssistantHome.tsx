import { Icon } from "@lawkit/ui";
import { ASSISTANT_COMMANDS, ASSISTANT_PROFILE, ASSISTANT_RECENT } from "./assistantData";
import * as css from "./aiAssistant.css";

interface AssistantHomeProps {
  contextLabel: string;
  onClose: () => void;
  onStartChat: () => void;
  onQuickCommand: (prompt: string) => void;
}

/** AI 비서 홈 — 인사 헤더 위에 카드가 겹쳐 올라온다(새 대화 · 자주 시키는 일 · 최근 대화). */
export const AssistantHome = ({ contextLabel, onClose, onStartChat, onQuickCommand }: AssistantHomeProps) => (
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
          안녕하세요, 손준호 님
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
            새 대화 시작
          </button>
        </div>

        <div className={css.homeCard}>
          <div className={css.homeCardTitle}>자주 시키는 일</div>
          <div>
            {ASSISTANT_COMMANDS.map((c) => (
              <button key={c.prompt} type="button" className={css.quickRow} onClick={() => onQuickCommand(c.prompt)}>
                {c.prompt}
                <Icon name="chevronRight" size="sm" className={css.quickIcon} />
              </button>
            ))}
          </div>
        </div>

        <div className={css.homeCard}>
          <div className={css.homeCardTitle}>최근 대화</div>
          <button type="button" className={css.recentRow} onClick={onStartChat}>
            <span className={css.botAvatar}>
              <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
            </span>
            <span className={css.recentMain}>
              <span className={css.operatorName}>{ASSISTANT_PROFILE.name}</span>
              <span className={css.recentPreview}>{ASSISTANT_RECENT.preview}</span>
            </span>
            <span className={css.recentTime}>{ASSISTANT_RECENT.time}</span>
          </button>
        </div>
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
