import { Icon } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import type { Approver } from "../../contract/request-schema";
import type { AdviceMessageInput } from "../hooks/useAdviceDetail";
import { AdviceComposer } from "./AdviceComposer";
import { ThreadMessageItem } from "./ThreadMessageItem";
import { formatShortDateTime } from "./toAdviceHistory";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

interface AdviceThreadCardProps {
  advice: AdviceResponse;
  draftApprover: Approver | null;
  isSending: boolean;
  onSend: (message: AdviceMessageInput, onSent: () => void) => void;
}

/** 질의·회신 스레드 — 대화 순서대로 읽고, 누구 차례인지 끝에서 바로 보이게 한다. */
export const AdviceThreadCard = ({ advice, draftApprover, isSending, onSend }: AdviceThreadCardProps) => {
  const lastMessage = advice.messages.at(-1);
  const isWaitingRequester = advice.status === "waitingRequester" && lastMessage;

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="messageCircle" size="sm" className={base.cheadIconMuted} />
        질의 · 회신
        <span className={base.cheadNote}>{advice.messages.length}건</span>
      </header>
      <div className={base.cbody}>
        {advice.messages.length === 0 ? (
          <p className={css.emptyThread}>아직 주고받은 내용이 없어요.</p>
        ) : (
          <ol className={css.thread}>
            {advice.messages.map((message) => (
              <ThreadMessageItem key={message.id} message={message} />
            ))}
          </ol>
        )}

        {isWaitingRequester && (
          <p className={css.waiting}>
            <Icon name="clock" size="sm" className={css.waitingIcon} />
            <span>
              <span className={css.waitingStrong}>{advice.requester.name ?? "요청자"}</span> 님의 답변을 기다리는 중 ·{" "}
              {formatShortDateTime(lastMessage.createdAt)} 질의
            </span>
          </p>
        )}

        <AdviceComposer
          key={advice.messages.length}
          advice={advice}
          draftApprover={draftApprover}
          isSending={isSending}
          onSend={onSend}
        />
      </div>
    </section>
  );
};
