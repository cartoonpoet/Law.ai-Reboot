import { Badge, Button, DdayBadge, ListGroup, ListGroupItem, Widget } from "@lawkit/ui";
import { NOTICES, SCHEDULE } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const MoreButton = () => (
  <Button size="small" variant="outline" color="secondary">
    전체보기
  </Button>
);

// "2026-09-15" → "09.15"
const toMonthDay = (ymd: string) => ymd.slice(5).replace("-", ".");

/** 다가오는 일정 — 한 줄 목록(날짜 · 제목/장소 · D-day). 큰 카드 대신 레일 폭에 맞춰 촘촘하게. */
export const ScheduleWidget = () => (
  <Widget title="다가오는 일정" badge={SCHEDULE.length} extra={<MoreButton />} flush>
    <ListGroup variant="flush">
      {SCHEDULE.map((s) => (
        <ListGroupItem
          key={s.id}
          leading={<span className={css.scheduleDate}>{toMonthDay(s.date)}</span>}
          trailing={<DdayBadge date={s.date} />}
        >
          <span className={css.taskMain}>
            <span className={css.railTitle}>{s.title}</span>
            <span className={css.taskSub}>
              {s.domain} · {s.body}
            </span>
          </span>
        </ListGroupItem>
      ))}
    </ListGroup>
  </Widget>
);

/** 공지·새소식 — 한 줄 목록, 새 글만 파란 배지. */
export const NoticeWidget = () => (
  <Widget title="공지 · 새소식" extra={<MoreButton />} flush>
    <ListGroup variant="flush">
      {NOTICES.map((n) => (
        <ListGroupItem
          key={n.id}
          leading={
            <Badge tone={n.isNew ? "primary" : "neutral"} variant="muted">
              {n.tag}
            </Badge>
          }
          trailing={<span className={css.noticeDate}>{n.date}</span>}
        >
          <span className={css.railTitle}>{n.title}</span>
        </ListGroupItem>
      ))}
    </ListGroup>
  </Widget>
);
