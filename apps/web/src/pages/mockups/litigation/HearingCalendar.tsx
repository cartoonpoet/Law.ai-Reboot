import { Button, CalendarPopover, Icon } from "@lawkit/ui";
import { getHearingTone } from "./hearingTone";
import { MOCK_HEARINGS, formatDate, type MockHearing } from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

const TODAY = "2026-09-19";
const VIEW_YEAR = 2026;
const VIEW_MONTH = 9;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 그 달 달력에 그릴 날짜들 — 앞뒤 달 칸까지 채워 7칸씩 맞춘다. */
const getCalendarDays = (year: number, month: number): { iso: string; isSameMonth: boolean }[] => {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { iso, isSameMonth: day.getMonth() === month - 1 };
  });
};

const getDayNumberClass = (iso: string, isSameMonth: boolean): string => {
  if (iso === TODAY) return `${css.dayNumber} ${css.dayNumberVariant.today}`;
  if (!isSameMonth) return `${css.dayNumber} ${css.dayNumberVariant.muted}`;
  const weekday = new Date(iso).getDay();
  if (weekday === 0) return `${css.dayNumber} ${css.dayNumberVariant.sunday}`;
  if (weekday === 6) return `${css.dayNumber} ${css.dayNumberVariant.saturday}`;
  return css.dayNumber;
};

/** 달력 한 칸의 일정 — 누르면 lawkit CalendarPopover 로 사건 정보가 뜬다. */
const EventPill = ({ hearing }: { hearing: MockHearing }) => (
  <CalendarPopover
    badge={hearing.kind}
    title={hearing.caseName}
    placement="right"
    fields={[
      { label: "일시", value: `${formatDate(hearing.date)} ${hearing.time}` },
      { label: "법원", value: hearing.courtName },
      { label: "장소", value: hearing.place },
      { label: "참석", value: hearing.attendee },
      ...(hearing.note ? [{ label: "메모", value: hearing.note }] : []),
    ]}
    primaryText="기일 수정"
    secondaryText="사건 바로가기"
  >
    <button type="button" className={`${css.eventPill} ${css.eventTone[getHearingTone(hearing.kind)]}`}>
      {hearing.time} {hearing.kind}
    </button>
  </CalendarPopover>
);

/** 달력 보기 — 카드 머리에 달 이동과 범례, 몸통에 월 격자. */
export const HearingCalendar = () => {
  const days = getCalendarDays(VIEW_YEAR, VIEW_MONTH);

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="calendar" size="sm" className={base.cheadIconMuted} />
        <span className={css.calendarHeadNav}>
          <Button size="small" variant="outline" color="secondary" aria-label="이전 달">
            ‹
          </Button>
          <span className={css.calendarMonth}>
            {VIEW_YEAR}년 {VIEW_MONTH}월
          </span>
          <Button size="small" variant="outline" color="secondary" aria-label="다음 달">
            ›
          </Button>
        </span>
        <span className={css.calendarLegend}>
          <span className={`${css.eventTag} ${css.eventTone.hearing}`}>변론·준비기일</span>
          <span className={`${css.eventTag} ${css.eventTone.verdict}`}>선고기일</span>
          <span className={`${css.eventTag} ${css.eventTone.deadline}`}>제출·납부 기한</span>
        </span>
      </header>

      <div className={base.cbody}>
        <div className={css.calendarGrid}>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className={css.weekdayCell}>
              {weekday}
            </div>
          ))}
          {days.map((day) => {
            const events = MOCK_HEARINGS.filter((hearing) => hearing.date === day.iso);
            return (
              <div key={day.iso} className={`${css.dayCell} ${day.isSameMonth ? "" : css.dayCellMuted}`}>
                <span className={getDayNumberClass(day.iso, day.isSameMonth)}>{Number(day.iso.split("-")[2])}</span>
                {events.map((hearing) => (
                  <EventPill key={hearing.id} hearing={hearing} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
