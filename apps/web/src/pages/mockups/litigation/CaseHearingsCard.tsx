import { Button, DdayBadge, Icon } from "@lawkit/ui";
import { getHearingTone } from "./hearingTone";
import { CASE_HEARINGS } from "./caseDetailMockData";
import { formatDate } from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

/** 이 사건의 기일 — 날짜 상자 + 종류 + 장소·참석자. */
export const CaseHearingsCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="calendar" size="sm" className={base.cheadIconMuted} />
      기일
      <span className={base.cheadNote}>{CASE_HEARINGS.length}건 예정</span>
    </header>

    <div className={base.cbody}>
      <div className={css.hearingList}>
        {CASE_HEARINGS.map((hearing) => (
          <div key={hearing.id} className={css.hearingRow}>
            <div className={css.dateBox}>
              <span className={css.dateBoxSub}>{Number(hearing.date.split("-")[1])}월</span>
              <span className={css.dateBoxDay}>{Number(hearing.date.split("-")[2])}</span>
              <span className={css.dateBoxSub}>{hearing.time}</span>
            </div>

            <div className={css.hearingMain}>
              <span className={css.cellRow}>
                <span className={`${css.eventTag} ${css.eventTone[getHearingTone(hearing.kind)]}`}>{hearing.kind}</span>
                <DdayBadge date={hearing.date} />
              </span>
              <span className={css.meta}>
                {formatDate(hearing.date)} {hearing.time} · {hearing.courtName} {hearing.place}
              </span>
              <span className={css.meta}>
                참석 {hearing.attendee}
                {hearing.note && ` · ${hearing.note}`}
              </span>
            </div>

            <div className={css.hearingActions}>
              <Button size="small" variant="outline" color="secondary">
                수정
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
