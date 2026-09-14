import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Chip, FloatingModal, Icon, Input } from "@lawkit/ui";
import { ASSISTANT_COMMANDS, ASSISTANT_FALLBACK, ASSISTANT_GREETING } from "./mockDashboardData";
import type { ChatMessage } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

interface AiAssistantDockProps {
  // 지금 사용자가 보고 있는 화면 — 비서가 맥락으로 쓴다.
  contextLabel: string;
}

/**
 * G. 항상 떠 있는 AI 비서 — 어느 화면에서든 우측 하단 버튼으로 열리는 비차단 대화창(lawkit FloatingModal).
 * 질문뿐 아니라 "배정해줘 / 초안 써줘 / 리마인드 보내줘" 같은 지시를 받고, 실행 전엔 항상 확인을 받는 형태.
 */
export const AiAssistantDock = ({ contextLabel }: AiAssistantDockProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([ASSISTANT_GREETING]);

  const handleSend = (text: string) => {
    const reply = ASSISTANT_COMMANDS.find((c) => c.prompt === text)?.reply ?? ASSISTANT_FALLBACK;
    const nextId = messages.length;
    setMessages([
      ...messages,
      { id: `u${nextId}`, role: "user", text },
      { id: `a${nextId}`, role: "assistant", text: reply },
    ]);
  };

  // React 19 폼 액션 — 제출 후 입력은 자동으로 비워진다.
  const handleSubmit = (formData: FormData) => {
    const text = String(formData.get("message") ?? "").trim();
    if (text) handleSend(text);
  };

  const handleChipKeyDown = (prompt: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSend(prompt);
    }
  };

  return (
    <>
      {!isOpen && (
        <button type="button" className={css.fab} onClick={() => setIsOpen(true)} aria-label="AI 비서 열기">
          <Icon name="autoAwesome" size="sm" className={css.fabIcon} />
          AI 비서
        </button>
      )}
      <FloatingModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="AI 비서"
        position="bottom-right"
        collapsible
        closeOnEscape
        footer={
          <form action={handleSubmit} className={css.promptForm}>
            <Input name="message" placeholder="질문하거나 시킬 일을 입력하세요" inputSize="small" wrapperClassName={css.promptInput} aria-label="AI 비서에게 메시지" />
            <Button type="submit" size="small">
              보내기
            </Button>
          </form>
        }
      >
        <div className={css.dockBody}>
          <span className={css.chatContext}>보고 있는 화면: {contextLabel}</span>
          <div className={css.chatLog} aria-live="polite">
            {[...messages].reverse().map((m) => (
              <div key={m.id} className={css.bubble[m.role]}>
                {m.text}
              </div>
            ))}
          </div>
          <div className={css.chipRow}>
            {ASSISTANT_COMMANDS.map((c) => (
              <Chip key={c.prompt} role="button" tabIndex={0} className={css.chip} onClick={() => handleSend(c.prompt)} onKeyDown={handleChipKeyDown(c.prompt)}>
                {c.prompt}
              </Chip>
            ))}
          </div>
        </div>
      </FloatingModal>
    </>
  );
};
