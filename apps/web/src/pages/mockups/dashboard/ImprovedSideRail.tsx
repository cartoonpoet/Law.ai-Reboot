import { Icon } from "@lawkit/ui";
import { Tag } from "../../../components/ui/Tag";
import { cx } from "../../contract/cx";
import { AiNote } from "./AiNote";
import { DOMAIN_TAG_COLOR, NOTICES, SCHEDULE, getDday } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/** 오른쪽 레일(개선) — 일정·공지 모양은 현재 그대로, 일정에 AI 가 준비해 둔 것이 있으면 한 줄로 붙인다. */
export const ImprovedSideRail = () => (
  <div className={css.rail}>
    <section className={css.card} aria-label="일정 · 기한 임박">
      <header className={css.cardHead}>
        <span className={css.cardTitle}>
          <Icon name="calendar" size="sm" className={css.cardTitleIcon} />
          일정 · 기한 임박
          <span className={css.countPill}>{SCHEDULE.length}</span>
        </span>
      </header>
      <div className={css.railBody}>
        {SCHEDULE.map((s) => {
          const dday = getDday(s.daysLeft);
          return (
            <div key={s.id} className={css.scheduleRow}>
              <div className={css.scheduleDate}>
                <div className={css.scheduleDay}>{s.date}</div>
                <div className={cx(css.scheduleDday, css.ddayTone[dday.tone])}>{dday.label}</div>
              </div>
              <span className={css.scheduleBar[dday.tone]} />
              <div className={css.scheduleMain}>
                <div>
                  <Tag color={DOMAIN_TAG_COLOR[s.tag]}>{s.tag}</Tag>
                </div>
                <div className={css.scheduleTitle}>{s.title}</div>
                <div className={css.scheduleBody}>{s.body}</div>
                {s.ai && <AiNote>{s.ai}</AiNote>}
              </div>
            </div>
          );
        })}
      </div>
    </section>

    <section className={css.card} aria-label="공지 · 새소식">
      <header className={css.cardHead}>
        <span className={css.cardTitle}>
          <Icon name="bell" size="sm" className={css.cardTitleIcon} />
          공지 · 새소식
        </span>
        <button type="button" className={css.linkMore}>
          전체보기
          <Icon name="chevronRight" size="sm" className={css.linkIcon} />
        </button>
      </header>
      <div className={css.railBody}>
        {NOTICES.map((n) => (
          <div key={n.id} className={css.noticeRow}>
            <Tag color={n.tag === "릴리즈" ? "primary" : "neutral"}>{n.tag}</Tag>
            <span className={css.noticeTitle}>{n.title}</span>
            {n.isNew && <span className={css.noticeNew}>N</span>}
            <span className={css.noticeDate}>{n.date}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);
