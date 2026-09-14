import { Icon } from "@lawkit/ui";
import type { AssistantAction } from "@lawai/contracts";
import { ASSISTANT_PROFILE } from "./assistantData";
import type { ChatMessage } from "./assistantData";
import { getActionKey } from "./useAssistantChat";
import type { ActionStateTypes } from "./useAssistantChat";
import * as css from "./aiAssistant.css";

interface AssistantChatProps {
  messages: ChatMessage[];
  quickReplies: string[];
  isReplying: boolean;
  actionStates: Record<string, ActionStateTypes>;
  onSend: (text: string) => void;
  onRunAction: (messageId: string, index: number, action: AssistantAction) => void;
  onDismissAction: (messageId: string, index: number) => void;
  onBack: () => void;
  onClose: () => void;
}

const CONFIRM_LABEL: Record<"assign" | "startReview", string> = {
  assign: "배정하기",
  startReview: "검토 시작",
};

const getConfirmText = (action: Exclude<AssistantAction, { type: "open" }>) =>
  action.type === "assign"
    ? `'${action.contractTitle}' 계약을 ${action.ownerName}에게 배정할까요?`
    : `'${action.contractTitle}' 계약의 법무 검토를 시작할까요?`;

const BotAvatar = () => (
  <span className={css.botAvatar}>
    <Icon name="autoAwesome" size="sm" className={css.botAvatarIcon} />
  </span>
);

/** AI 비서 대화 — 실제 AI 답변, 제안 행동(화면 열기 / 실행 전 확인 카드), 빠른 답장, 둥근 입력창. */
export const AssistantChat = ({
  messages,
  quickReplies,
  isReplying,
  actionStates,
  onSend,
  onRunAction,
  onDismissAction,
  onBack,
  onClose,
}: AssistantChatProps) => {
  const isLastFromAssistant = messages.at(-1)?.role === "assistant";

  // React 19 폼 액션 — 제출 후 입력은 자동으로 비워진다.
  const handleSubmit = (formData: FormData) => {
    const text = String(formData.get("message") ?? "").trim();
    if (text && !isReplying) onSend(text);
  };

  return (
    <>
      <header className={css.chatHeader}>
        <button type="button" className={css.iconButton} onClick={onBack} aria-label="홈으로">
          <Icon name="chevronLeft" size="sm" />
        </button>
        <BotAvatar />
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
                <BotAvatar />
                <div className={css.msgMain}>
                  <span className={css.msgMeta}>
                    <b className={css.msgName}>AI 비서</b>
                    {m.time}
                  </span>
                  <div className={css.bubbleBot}>{m.text}</div>
                  {m.actions.length > 0 && (
                    <div className={css.actionList}>
                      {m.actions.map((action, index) => {
                        const key = getActionKey(m.id, index);
                        if (action.type === "open") {
                          return (
                            <button key={key} type="button" className={css.actionOpen} onClick={() => onRunAction(m.id, index, action)}>
                              {action.label}
                              <Icon name="chevronRight" size="sm" className={css.quickIcon} />
                            </button>
                          );
                        }
                        const state = actionStates[key];
                        return (
                          <div key={key} className={css.actionCard}>
                            <span className={css.actionCardText}>{getConfirmText(action)}</span>
                            {state === "done" && <span className={css.actionResult}>완료했어요</span>}
                            {state === "dismissed" && <span className={css.actionResult}>취소했어요</span>}
                            {(state === undefined || state === "running") && (
                              <div className={css.actionCardButtons}>
                                <button
                                  type="button"
                                  className={css.actionButton.confirm}
                                  disabled={state === "running"}
                                  onClick={() => onRunAction(m.id, index, action)}
                                >
                                  {state === "running" ? "처리 중…" : CONFIRM_LABEL[action.type]}
                                </button>
                                <button
                                  type="button"
                                  className={css.actionButton.cancel}
                                  disabled={state === "running"}
                                  onClick={() => onDismissAction(m.id, index)}
                                >
                                  취소
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={m.id} className={css.userRow}>
                <div className={css.bubbleUser}>{m.text}</div>
                <span className={css.msgMeta}>{m.time}</span>
              </div>
            ),
          )}
          {isReplying && (
            <div className={css.msgRow} aria-label="답을 준비하고 있어요">
              <BotAvatar />
              <div className={css.bubbleBot}>
                <span className={css.typing}>
                  <span className={css.typingDot} />
                  <span className={css.typingDot} />
                  <span className={css.typingDot} />
                </span>
              </div>
            </div>
          )}
          {!isReplying && isLastFromAssistant && quickReplies.length > 0 && (
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
          <input
            name="message"
            className={css.composerInput}
            placeholder={isReplying ? "답을 준비하고 있어요" : "메시지를 입력하세요"}
            aria-label="AI 비서에게 메시지"
            autoComplete="off"
            maxLength={2000}
          />
          <button type="submit" className={css.sendButton} aria-label="보내기" disabled={isReplying}>
            <Icon name="sendSolid" size="sm" className={css.sendIcon} />
          </button>
        </div>
        <div className={css.composerHint}>배정·검토 시작 같은 일은 확인을 눌러야 실행돼요</div>
      </form>
    </>
  );
};
