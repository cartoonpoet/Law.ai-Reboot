import { Avatar, FileAttachBadge } from "@lawkit/ui";
import * as css from "../adviceDetail.css";
import { ROLE_AVATAR_COLOR, type ThreadMessage } from "./adviceDetailData";

interface ThreadMessageItemProps {
  message: ThreadMessage;
}

/** 질의·회신 한 건 — 요청자는 중립 말풍선, 법무팀은 옅은 info 말풍선으로 화자를 구분한다. */
export const ThreadMessageItem = ({ message }: ThreadMessageItemProps) => (
  <li className={css.message}>
    <Avatar initials={message.authorName[0]} size="sm" color={ROLE_AVATAR_COLOR[message.role]} />
    <div className={css.messageMain}>
      <div className={css.messageHead}>
        <span className={css.messageAuthor}>{message.authorName}</span>
        <span className={css.messageDept}>{message.authorDept}</span>
        <span className={css.messageKind[message.role]}>{message.kind}</span>
        <time className={css.messageTime}>{message.sentAt}</time>
      </div>
      <div className={css.bubble[message.role]}>
        {message.body}
        {message.attachments.length > 0 && (
          <div className={css.messageFiles}>
            {message.attachments.map((name) => (
              <FileAttachBadge key={name} filename={name} />
            ))}
          </div>
        )}
      </div>
    </div>
  </li>
);
