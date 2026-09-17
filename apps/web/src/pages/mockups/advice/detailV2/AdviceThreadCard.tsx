import { Button, Icon, Textarea } from "@lawkit/ui";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetailV2.css";
import { ADVICE, THREAD_MESSAGES } from "./adviceDetailV2Data";
import { ThreadMessageItem } from "./ThreadMessageItem";

/** 질의·회신 스레드 — 대화 순서대로 읽고, 누구 차례인지 끝에서 바로 보이게 한다. */
export const AdviceThreadCard = () => {
  const lastMessage = THREAD_MESSAGES[THREAD_MESSAGES.length - 1];
  const isWaitingRequester = lastMessage.role === "legal";

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="messageCircle" size="sm" className={base.cheadIconMuted} />
        질의 · 회신
        <span className={base.cheadNote}>{THREAD_MESSAGES.length}건</span>
      </header>
      <div className={base.cbody}>
        <ol className={css.thread}>
          {THREAD_MESSAGES.map((message) => (
            <ThreadMessageItem key={message.id} message={message} />
          ))}
        </ol>

        {isWaitingRequester && (
          <p className={css.waiting}>
            <Icon name="clock" size="sm" className={css.waitingIcon} />
            <span>
              <span className={css.waitingStrong}>{ADVICE.requesterName}</span> 님의 답변을 기다리는 중 ·{" "}
              {lastMessage.sentAt} 질의
            </span>
          </p>
        )}

        <div className={css.composer}>
          <Textarea
            textareaSize="small"
            rows={3}
            resize="none"
            placeholder="요청자에게 추가로 확인할 내용을 적어주세요. 정식 회신은 상단 '회신 작성'에서 작성합니다."
            aria-label="추가 질의 입력"
          />
          <div className={css.composerActions}>
            <Button
              variant="outline"
              color="secondary"
              size="small"
              iconLeft={<Icon name="paperclip" size="sm" className={css.icon14} />}
            >
              파일 첨부
            </Button>
            <div className={css.composerButtons}>
              <Button size="small">추가 질의 보내기</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
