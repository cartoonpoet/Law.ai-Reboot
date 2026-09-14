import { Callout, DdayBadge, Icon, ListGroup, ListGroupItem, Timeline, Widget } from "@lawkit/ui";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
import { AI_SUGGESTIONS, DAY_PLAN, TASKS } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const TIMELINE_ITEMS = DAY_PLAN.map((b) => ({
  id: b.id,
  date: b.time,
  title: b.title,
  description: <AiNote>{b.ai}</AiNote>,
  status: b.status,
}));

const WEEK_TASKS = [...TASKS].sort((a, b) => a.due.localeCompare(b.due));

/**
 * E. AI 데일리 플랜 — 기한·중요도·회의 일정을 보고 AI 가 오늘 할 순서를 시간축으로 짜 준다.
 * 지금 해야 할 블록이 강조되고, 각 블록에 AI 가 준비한 것이 붙는다. 오른쪽엔 이번 주 마감과 AI 제안.
 */
export const DailyPlanVariant = () => (
  <div className={css.page}>
    <DashboardHeader />

    <Callout intent="info" title="AI 가 오늘 순서를 짰어요" icon={<Icon name="autoAwesome" size="sm" />}>
      지금은 10시 집중 시간이에요. 한라산 EV 계약 리스크 2건을 먼저 보고, 11시에 오늘 마감인 결재를 처리하세요.
    </Callout>

    <div className={css.mainGrid}>
      <Widget title="오늘의 흐름 · AI 추천 순서" badge={DAY_PLAN.length} flush>
        <div className={css.widgetBody}>
          <Timeline items={TIMELINE_ITEMS} />
        </div>
      </Widget>

      <aside className={css.rail}>
        <Widget title="이번 주 마감" badge={WEEK_TASKS.length} flush>
          <ListGroup variant="flush">
            {WEEK_TASKS.map((t) => (
              <ListGroupItem key={t.id} trailing={<DdayBadge date={t.due} />}>
                <span className={css.taskMain}>
                  <span className={css.railTitle}>{t.title}</span>
                  <span className={css.taskSub}>{t.domain} · {t.action}</span>
                </span>
              </ListGroupItem>
            ))}
          </ListGroup>
        </Widget>
        <Widget title="AI 제안" flush>
          <ul className={css.suggestionList}>
            {AI_SUGGESTIONS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Widget>
      </aside>
    </div>
  </div>
);
