import { Icon } from "@lawkit/ui";
import { cx } from "../contract/cx";
import type { DeadlineItem } from "./dashboardTypes";
import { getDday } from "./dday";
import * as css from "./dashboard.css";

interface DeadlinePanelProps {
  deadlines: DeadlineItem[];
  isLoading: boolean;
  onOpen: (deadline: DeadlineItem) => void;
}

// 2026-09-14T.. → 09.14
const formatMonthDay = (iso: string) => iso.slice(5, 10).replace("-", ".");

/** 기한 임박 — 나와 관련된 계약 중 2주 안에 검토기한이 오는 계약. */
export const DeadlinePanel = ({ deadlines, isLoading, onOpen }: DeadlinePanelProps) => (
  <section className={css.card} aria-label="기한 임박">
    <header className={css.cardHead}>
      <span className={css.cardTitle}>
        <Icon name="calendar" size="sm" className={css.cardTitleIcon} />
        기한 임박
        {!isLoading && <span className={css.countPill}>{deadlines.length}</span>}
      </span>
      <span className={css.cardMeta}>2주 이내</span>
    </header>

    {deadlines.length === 0 ? (
      <div className={css.emptyState}>{isLoading ? "기한을 불러오는 중이에요" : "2주 안에 기한이 오는 계약이 없어요"}</div>
    ) : (
      <div className={css.railBody}>
        {deadlines.map((d) => {
          const dday = getDday(d.daysLeft);
          return (
            <button key={d.id} type="button" className={css.deadlineRow} onClick={() => onOpen(d)}>
              <span className={css.scheduleDate}>
                <span className={css.scheduleDay}>{formatMonthDay(d.dueDate)}</span>
                <span className={cx(css.scheduleDday, css.ddayTone[dday.tone])}>{dday.label}</span>
              </span>
              <span className={css.scheduleBar[dday.tone]} />
              <span className={css.scheduleMain}>
                <span className={css.scheduleTitle}>{d.title}</span>
                <span className={css.scheduleBody}>
                  {d.code} · {d.status}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    )}
  </section>
);
