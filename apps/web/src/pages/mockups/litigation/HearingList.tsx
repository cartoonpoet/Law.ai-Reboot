import { Button, DdayBadge, Icon } from "@lawkit/ui";
import { getHearingTone } from "./hearingTone";
import { MOCK_HEARINGS, formatDate } from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

/** 목록 보기 — 날짜순으로 쌓아 남은 일수와 참석자를 한눈에 본다. */
export const HearingList = () => {
  const sorted = MOCK_HEARINGS.toSorted((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="list" size="sm" className={base.cheadIconMuted} />
        기일 목록
        <span className={base.cheadNote}>{sorted.length}건</span>
      </header>

      <div className={base.cbody}>
        <div className={css.hearingList}>
          {sorted.map((hearing) => (
            <div key={hearing.id} className={css.hearingRow}>
              <div className={css.dateBox}>
                <span className={css.dateBoxSub}>{Number(hearing.date.split("-")[1])}월</span>
                <span className={css.dateBoxDay}>{Number(hearing.date.split("-")[2])}</span>
                <span className={css.dateBoxSub}>{hearing.time}</span>
              </div>

              <div className={css.hearingMain}>
                <span className={css.cellRow}>
                  <span className={`${css.eventTag} ${css.eventTone[getHearingTone(hearing.kind)]}`}>{hearing.kind}</span>
                  <span className={css.hearingTitle}>{hearing.caseName}</span>
                  <DdayBadge date={hearing.date} />
                </span>
                <span className={css.meta}>
                  {formatDate(hearing.date)} {hearing.time} · {hearing.courtName} {hearing.place} · 참석{" "}
                  {hearing.attendee}
                </span>
                {hearing.note && <span className={css.meta}>{hearing.note}</span>}
              </div>

              <div className={css.hearingActions}>
                <Button size="small" variant="outline" color="secondary">
                  사건 열기
                </Button>
                <Button size="small" variant="outline" color="secondary">
                  일정 수정
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
