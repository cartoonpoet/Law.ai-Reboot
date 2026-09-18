import { Button, ButtonGroup, Icon, Input, Spinner } from "@lawkit/ui";
import type { AdminSupportThreadRow, SupportContext, SupportStatusTypes } from "@lawai/contracts";
import { AdminShell } from "../../components/layout/AdminShell";
import { formatRelative } from "../tenants/tenantLabels";
import { useSupportInbox } from "./hooks/useSupportInbox";
import * as css from "./supportInbox.css";

const STATUS_LABEL: Record<SupportStatusTypes, string> = {
  open: "답변 대기",
  answered: "답변 완료",
  closed: "종료",
};

const STATUS_TABS: { value: SupportStatusTypes | ""; label: string }[] = [
  { value: "open", label: "답변 대기" },
  { value: "answered", label: "답변 완료" },
  { value: "closed", label: "종료" },
  { value: "", label: "전체" },
];

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

const getStatusClass = (status: SupportStatusTypes) => {
  if (status === "open") return `${css.statusBadge} ${css.statusOpen}`;
  if (status === "answered") return `${css.statusBadge} ${css.statusAnswered}`;
  return css.statusBadge;
};

// 오류 문의면 화면이 자동으로 담아 보낸 정보.
const getContextLines = (context: SupportContext | null): string[] => {
  if (!context) return [];
  return [
    context.screen ? `화면: ${context.screen}` : "",
    context.path ? `주소: ${context.path}` : "",
    context.errorMessage ? `오류: ${context.errorMessage}` : "",
  ].filter((line) => line.length > 0);
};

export const SupportInboxPage = () => {
  const inbox = useSupportInbox();

  const handleReply = (close: boolean) => (formData: FormData) => {
    const body = String(formData.get("body") ?? "").trim();
    if (!body || !inbox.selectedId || inbox.isReplying) return;
    void inbox.reply({ threadId: inbox.selectedId, body, close });
  };

  const renderThread = (thread: AdminSupportThreadRow) => (
    <button
      key={thread.id}
      type="button"
      className={`${css.threadButton} ${thread.id === inbox.selectedId ? css.threadActive : ""}`}
      onClick={() => inbox.select(thread.id)}
    >
      <span className={css.threadTop}>
        <span className={css.subject}>{thread.subject}</span>
        <span className={getStatusClass(thread.status)}>{STATUS_LABEL[thread.status]}</span>
      </span>
      <span className={css.preview}>
        {thread.lastMessageRole === "admin" ? "답변: " : ""}
        {thread.lastMessagePreview}
      </span>
      <span className={css.meta}>
        {thread.userName ?? "알 수 없음"} · {thread.tenantName ?? "-"} · {formatRelative(thread.lastMessageAt)}
      </span>
    </button>
  );

  return (
    <AdminShell title="문의함"
      description="사용자가 로아이에게 남긴 문의입니다. 답변을 보내면 문의한 사람 화면에 바로 알림으로 뜹니다.">
      <div className={css.filterBar}>
        <ButtonGroup
          variant="segmented"
          value={inbox.status}
          onChange={(next) => inbox.changeStatus(String(next) as typeof inbox.status)}
          items={STATUS_TABS.map((tab) => ({
            value: tab.value,
            label: tab.value === "open" && inbox.openCount > 0 ? `${tab.label} ${inbox.openCount}` : tab.label,
          }))}
        />
        <div className={css.searchBox}>
          <Input
            inputSize="medium"
            placeholder="제목·문의한 사람·회사 검색"
            value={inbox.keyword}
            onChange={(event) => inbox.changeKeyword(event.target.value)}
            leftIcon={<Icon name="search" size="sm" className={css.searchIcon} />}
          />
        </div>
        <span className={css.listCount}>
          {inbox.threads.length}
          {inbox.keyword.trim() ? ` / ${inbox.totalCount}` : ""}건
        </span>
      </div>

      {inbox.isLoading ? (
        <Spinner label="불러오는 중..." />
      ) : (
        <div className={css.layout}>
          <div className={css.listBox}>
            {inbox.threads.length === 0 ? (
              <p className={css.placeholder}>
                {inbox.keyword.trim() ? "검색과 맞는 문의가 없습니다." : "이 상태의 문의가 없습니다."}
              </p>
            ) : (
              inbox.threads.map(renderThread)
            )}
          </div>

          <div className={css.detailBox}>
            {!inbox.selectedId && <p className={css.placeholder}>왼쪽에서 문의를 고르면 내용이 보여요.</p>}
            {inbox.selectedId && inbox.isThreadLoading && <Spinner label="불러오는 중..." />}
            {inbox.thread && (
              <>
                <div className={css.detailHead}>
                  <h2 className={css.detailSubject}>{inbox.thread.subject}</h2>
                  <span className={css.meta}>
                    {inbox.thread.userName ?? "알 수 없음"}
                    {inbox.thread.userEmail ? ` (${inbox.thread.userEmail})` : ""} · {inbox.thread.tenantName ?? "-"} ·{" "}
                    {formatTime(inbox.thread.createdAt)}
                  </span>
                </div>

                {getContextLines(inbox.thread.context).length > 0 && (
                  <div className={css.contextBox}>
                    {getContextLines(inbox.thread.context).map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                )}

                <div className={css.messageList}>
                  {inbox.thread.messages.map((message) => {
                    const isAdmin = message.authorRole === "admin";
                    return (
                      <div key={message.id} className={`${css.messageRow} ${isAdmin ? css.messageMine : ""}`}>
                        <div className={`${css.bubble} ${isAdmin ? css.bubbleMine : ""}`}>{message.body}</div>
                        <span className={css.messageMeta}>
                          {isAdmin ? (message.authorName ?? "관리자") : (message.authorName ?? "문의자")} ·{" "}
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {inbox.thread.status === "closed" ? (
                  <p className={css.placeholder}>종료된 문의입니다.</p>
                ) : (
                  <form action={handleReply(false)} className={css.replyArea}>
                    <textarea
                      name="body"
                      className={css.textarea}
                      placeholder="답변을 적어 주세요"
                      aria-label="답변 내용"
                    />
                    {inbox.replyError && (
                      <p className={css.errorText}>
                        {inbox.replyError instanceof Error ? inbox.replyError.message : "답변을 보내지 못했습니다."}
                      </p>
                    )}
                    <div className={css.buttonRow}>
                      <Button type="submit" disabled={inbox.isReplying}>
                        {inbox.isReplying ? "보내는 중…" : "답변 보내기"}
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        color="secondary"
                        disabled={inbox.isReplying}
                        formAction={handleReply(true)}
                      >
                        답변하고 종료
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
};
