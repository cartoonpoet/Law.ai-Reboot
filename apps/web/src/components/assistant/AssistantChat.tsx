import { Icon } from "@lawkit/ui";
import { ASSISTANT_PROFILE } from "./assistantData";
import type { ChatMessage } from "./assistantData";
import * as css from "./aiAssistant.css";

interface AssistantChatProps {
  messages: ChatMessage[];
  quickReplies: string[];
  onSend: (text: string) => void;
  onBack: () => void;
  onClose: () => void;
}

/** AI 비서 대화 — 아바타·이름·시간이 붙은 말풍선, 마지막 답 아래 빠른 답장, 둥근 입력창. */
export const AssistantChat = ({ messages, quickReplies, onSend, onBack, onClose }: AssistantChatProps) => {
  const isLastFromAssistant = messages.at(-1)?.role === "assistant";

  // React 19 폼 액션 — 제출 후 입력은 자동으로 비워진다.
  const handleSubmit = (formData: FormData) => {
    const text = String(formData.get("message") ?? "").trim();
    if (text) onSend(text);
  };

  return (
    <>
      <header className={css.chatHeader}>
        <button type="button" className={css.iconButton} onClick={onBack} aria-label="홈으로">
          <Icon name="chevronLeft" size="sm" />
        </button>
        <span className={css.botAvatar}>
          <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
        </span>
        <span className={css.headerMain}>
          <span className={css.operatorName}>{ASSISTANT_PROFILE.name}</span>
          <span className={css.statusText}>
            <span className={css.onlineDot} />
            {ASSISTANT_PROFILE.status}
          </span>
        </span>
        <button type="button" className={css.iconButton} onClick={onClose} aria-label="AI 비서 닫기">
          <Icon name="close" size="sm" />
        </button>
      </header>

      {/* column-reverse 로 새 메시지가 항상 아래에 보이게(스크롤 effect 없이) */}
      <div className={css.chatBody} aria-live="polite">
        <div className={css.chatInner}>
          <div className={css.dateDivider}>오늘</div>
          {messages.map((m) =>
            m.role === "assistant" ? (
              <div key={m.id} className={css.msgRow}>
                <span className={css.botAvatar}>
                  <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
                </span>
                <div className={css.msgMain}>
                  <span className={css.msgMeta}>
                    <b className={css.msgName}>AI 비서</b>
                    {m.time}
                  </span>
                  <div className={css.bubbleBot}>{m.text}</div>
                </div>
              </div>
            ) : (
              <div key={m.id} className={css.userRow}>
                <div className={css.bubbleUser}>{m.text}</div>
                <span className={css.msgMeta}>{m.time}</span>
              </div>
            ),
          )}
          {isLastFromAssistant && quickReplies.length > 0 && (
            <div className={css.quickReplies}>
              {quickReplies.map((prompt) => (
                <button key={prompt} type="button" className={css.quickReply} onClick={() => onSend(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form action={handleSubmit} className={css.composer}>
        <div className={css.composerBox}>
          <input name="message" className={css.composerInput} placeholder="메시지를 입력하세요" aria-label="AI 비서에게 메시지" autoComplete="off" />
          <button type="submit" className={css.sendButton} aria-label="보내기">
            <Icon name="sendSolid" size="sm" className={css.sendIcon} />
          </button>
        </div>
        <div className={css.composerHint}>실행이 필요한 일은 AI 가 먼저 확인을 받아요</div>
      </form>
    </>
  );
};
