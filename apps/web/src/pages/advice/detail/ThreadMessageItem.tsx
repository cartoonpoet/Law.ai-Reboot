import { Avatar } from "@lawkit/ui";
import type { AdviceMessageDto, AdviceMessageKindTypes } from "@lawai/contracts";
import { MESSAGE_KIND_LABEL } from "../adviceMeta";
import { formatShortDateTime } from "./toAdviceHistory";
import * as css from "./adviceDetail.css";

// 추가 질의·회신은 법무팀, 답변은 요청자 쪽 말.
const KIND_SIDE: Record<AdviceMessageKindTypes, css.ThreadSideTypes> = {
  followup: "legal",
  answer: "legal",
  reply: "requester",
};

const AVATAR_COLOR: Record<css.ThreadSideTypes, "primary" | "info"> = { requester: "primary", legal: "info" };

interface ThreadMessageItemProps {
  message: AdviceMessageDto;
}

/** 질의·회신 한 건 — 요청자는 중립 말풍선, 법무팀은 옅은 info 말풍선으로 화자를 구분한다. */
export const ThreadMessageItem = ({ message }: ThreadMessageItemProps) => {
  const side = KIND_SIDE[message.kind];
  const authorName = message.author.name ?? "알 수 없음";

  return (
    <li className={css.message}>
      <Avatar initials={authorName[0]} size="sm" color={AVATAR_COLOR[side]} />
      <div className={css.messageMain}>
        <div className={css.messageHead}>
          <span className={css.messageAuthor}>{authorName}</span>
          {message.author.dept && <span className={css.messageDept}>{message.author.dept}</span>}
          <span className={css.messageKind[side]}>{MESSAGE_KIND_LABEL[message.kind]}</span>
          <time className={css.messageTime} dateTime={message.createdAt}>
            {formatShortDateTime(message.createdAt)}
          </time>
        </div>
        <div className={css.bubble[side]}>{message.body}</div>
      </div>
    </li>
  );
};
