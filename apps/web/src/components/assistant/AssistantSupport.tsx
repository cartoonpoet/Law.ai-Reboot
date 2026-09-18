import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import type { SupportContext, SupportStatusTypes, SupportThreadDto } from "@lawai/contracts";
import { cx } from "../../pages/contract/cx";
import { useSupport } from "./useSupport";
import { ASSISTANT_NAME } from "./assistantData";
import * as css from "./aiAssistant.css";
import * as supportCss from "./assistantSupport.css";

const STATUS_LABEL: Record<SupportStatusTypes, string> = {
  open: "답변 대기",
  answered: "답변 옴",
  closed: "종료",
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });

const getStatusClass = (status: SupportStatusTypes) =>
  cx(
    supportCss.statusBadge,
    status === "answered" && supportCss.statusAnswered,
    status === "closed" && supportCss.statusClosed,
  );

// 오류 문의일 때 자동으로 담은 정보 — 사람이 읽을 수 있게 한 줄씩.
const getContextLines = (context: SupportContext | null): string[] => {
  if (!context) return [];
  return [
    context.screen ? `화면: ${context.screen}` : "",
    context.path ? `주소: ${context.path}` : "",
    context.errorMessage ? `오류: ${context.errorMessage}` : "",
  ].filter((line) => line.length > 0);
};

interface AssistantSupportProps {
  threadId: string | null;
  draftContext: SupportContext | null;
  onOpenThread: (threadId: string | null) => void;
  onClose: () => void;
  bottomNav: ReactNode;
}

/** AI 비서 문의 — 내 문의 목록 · 새 문의 남기기 · 주고받은 내용(관리자 답변은 실시간으로 도착). */
export const AssistantSupport = ({
  threadId,
  draftContext,
  onOpenThread,
  onClose,
  bottomNav,
}: AssistantSupportProps) => {
  const support = useSupport(threadId);
  // 오류 화면에서 열었으면 바로 쓰기 화면부터 보여준다.
  const [isWriting, setIsWriting] = useState(draftContext !== null);

  const handleCreate = async (formData: FormData) => {
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!subject || !body || support.isSending) return;
    const newThreadId = await support.createThread({
      subject,
      body,
      context: draftContext ?? undefined,
    });
    setIsWriting(false);
    onOpenThread(newThreadId);
  };

  const handleReply = (formData: FormData) => {
    const body = String(formData.get("body") ?? "").trim();
    if (!body || !threadId || support.isSending) return;
    void support.sendMessage({ threadId, body });
  };

  const renderHeader = (title: string, onBack: (() => void) | null) => (
    <header className={css.chatHeader}>
      {onBack && (
        <button type="button" className={css.iconButton} onClick={onBack} aria-label="문의 목록으로">
          <Icon name="chevronLeft" size="sm" />
        </button>
      )}
      <h2 className={cx(supportCss.headerTitle, !onBack && supportCss.headerTitleFlush)}>{title}</h2>
      <button type="button" className={css.iconButton} onClick={onClose} aria-label={`${ASSISTANT_NAME} 닫기`}>
        <Icon name="close" size="sm" />
      </button>
    </header>
  );

  const renderThreadRow = (thread: SupportThreadDto) => (
    <button
      key={thread.id}
      type="button"
      className={supportCss.threadButton}
      onClick={() => onOpenThread(thread.id)}
    >
      <span className={supportCss.threadTop}>
        <span className={supportCss.threadSubject}>{thread.subject}</span>
        <span className={getStatusClass(thread.status)}>{STATUS_LABEL[thread.status]}</span>
      </span>
      <span className={supportCss.threadPreview}>
        {thread.lastMessageRole === "admin" ? "답변: " : ""}
        {thread.lastMessagePreview}
      </span>
      <span className={supportCss.threadTime}>{formatTime(thread.lastMessageAt)}</span>
    </button>
  );

  if (threadId) {
    const thread = support.thread;
    return (
      <>
        {renderHeader(thread?.subject ?? "문의", () => onOpenThread(null))}
        <div className={supportCss.scroll}>
          {support.isThreadLoading && <p className={supportCss.emptyText}>불러오는 중…</p>}
          {thread && getContextLines(thread.context).length > 0 && (
            <div className={supportCss.contextBox}>
              {getContextLines(thread.context).map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          {thread?.messages.map((message) => {
            const isMine = message.authorRole === "user";
            return (
              <div key={message.id} className={cx(supportCss.messageRow, isMine && supportCss.messageMine)}>
                <div className={cx(supportCss.bubble, isMine && supportCss.bubbleMine)}>{message.body}</div>
                <span className={supportCss.messageMeta}>
                  {isMine ? "나" : (message.authorName ?? "고객지원")} · {formatTime(message.createdAt)}
                </span>
              </div>
            );
          })}
          {thread?.status === "closed" && (
            <p className={supportCss.emptyText}>종료된 문의예요. 더 궁금하면 새 문의를 남겨 주세요.</p>
          )}
        </div>
        {thread && thread.status !== "closed" && (
          <form action={handleReply} className={supportCss.formArea}>
            <textarea
              name="body"
              className={supportCss.textarea}
              placeholder="이어서 쓸 내용을 적어 주세요"
              aria-label="문의 이어서 쓰기"
            />
            <button type="submit" className={supportCss.primaryButton} disabled={support.isSending}>
              {support.isSending ? "보내는 중…" : "보내기"}
            </button>
          </form>
        )}
        {bottomNav}
      </>
    );
  }

  if (isWriting) {
    return (
      <>
        {renderHeader("새 문의", () => setIsWriting(false))}
        <form action={handleCreate} className={supportCss.scroll}>
          <p className={supportCss.intro}>
            문제가 생긴 상황을 적어 주시면 확인해서 답변드려요. 답변이 오면 알림으로 바로 알려드립니다.
          </p>
          {getContextLines(draftContext).length > 0 && (
            <div className={supportCss.contextBox}>
              {getContextLines(draftContext).map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>위 정보가 문의와 함께 전달돼요.</div>
            </div>
          )}
          <div className={supportCss.field}>
            <label className={supportCss.label} htmlFor="support-subject">
              제목
            </label>
            <input
              id="support-subject"
              name="subject"
              className={supportCss.input}
              defaultValue={draftContext?.screen ? `${draftContext.screen} 오류 문의` : ""}
              placeholder="무엇에 대한 문의인가요?"
            />
          </div>
          <div className={supportCss.field}>
            <label className={supportCss.label} htmlFor="support-body">
              내용
            </label>
            <textarea
              id="support-body"
              name="body"
              className={supportCss.textarea}
              placeholder="어떤 상황에서 무엇이 안 됐는지 적어 주세요"
            />
          </div>
          <button type="submit" className={supportCss.primaryButton} disabled={support.isSending}>
            {support.isSending ? "보내는 중…" : "문의 보내기"}
          </button>
        </form>
        {bottomNav}
      </>
    );
  }

  return (
    <>
      {renderHeader("문의", null)}
      <div className={supportCss.scroll}>
        <p className={supportCss.intro}>
          쓰다가 막히거나 오류가 나면 문의를 남겨 주세요. 답변이 오면 알림으로 바로 알려드려요.
        </p>
        <button type="button" className={supportCss.primaryButton} onClick={() => setIsWriting(true)}>
          새 문의 남기기
        </button>
        {support.isLoading && <p className={supportCss.emptyText}>불러오는 중…</p>}
        {!support.isLoading && support.threads.length === 0 && (
          <p className={supportCss.emptyText}>아직 남긴 문의가 없어요.</p>
        )}
        {support.threads.length > 0 && (
          <div className={supportCss.threadList}>{support.threads.map(renderThreadRow)}</div>
        )}
      </div>
      {bottomNav}
    </>
  );
};
