import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Badge, Button, Callout, DdayBadge, Icon, ListGroup, ListGroupItem, StatCell, StatGrid, Widget } from "@lawkit/ui";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
import { NoticeWidget, ScheduleWidget } from "./DashboardSideWidgets";
import { AI_BRIEF, KPIS, TASKS } from "./mockDashboardData";
import type { KpiItem } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const WEEK_DAYS = 7;

const isWithinWeek = (ymd: string) => Math.ceil((new Date(ymd).getTime() - Date.now()) / 86_400_000) <= WEEK_DAYS;

/**
 * A. 할 일 + AI 이유 — 통계 4칸이 곧 필터. 할 일마다 AI 가 "왜 지금인지"와 "준비해 둔 것"을 한 줄로 붙인다.
 */
export const FocusVariant = () => {
  const [filter, setFilter] = useState<KpiItem["kind"] | null>(null);
  const tasks = TASKS.filter((t) => filter === null || (filter === "all" ? isWithinWeek(t.due) : t.kind === filter));
  const selected = KPIS.find((k) => k.kind === filter);

  const handleToggle = (kind: KpiItem["kind"]) => setFilter(filter === kind ? null : kind);
  const handleKeyDown = (kind: KpiItem["kind"]) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(kind);
    }
  };

  return (
    <div className={css.page}>
      <DashboardHeader />

      <Callout intent="info" title="AI 오늘의 브리핑" icon={<Icon name="autoAwesome" size="sm" />}>
        {AI_BRIEF}
      </Callout>

      <StatGrid>
        {KPIS.map((k) => (
          <StatCell
            key={k.label}
            label={k.label}
            value={k.value}
            valueColor={k.color}
            active={filter === k.kind}
            role="button"
            tabIndex={0}
            aria-pressed={filter === k.kind}
            className={css.statButton}
            onClick={() => handleToggle(k.kind)}
            onKeyDown={handleKeyDown(k.kind)}
          />
        ))}
      </StatGrid>

      <div className={css.mainGrid}>
        <Widget
          title={selected ? `지금 처리할 일 · ${selected.label}` : "지금 처리할 일 · AI 우선순위"}
          badge={tasks.length}
          flush
          extra={
            filter !== null && (
              <Button size="small" variant="outline" color="secondary" onClick={() => setFilter(null)}>
                필터 해제
              </Button>
            )
          }
        >
          <ListGroup variant="flush">
            {tasks.map((t) => (
              <ListGroupItem
                key={t.id}
                leading={
                  <Badge tone={t.domain === "계약" ? "primary" : "neutral"} variant="muted">
                    {t.domain}
                  </Badge>
                }
                trailing={
                  <span className={css.trailing}>
                    <DdayBadge date={t.due} />
                    <Button size="small" variant={t.kind === "approval" ? "default" : "outline"}>
                      {t.action}
                    </Button>
                  </span>
                }
              >
                <span className={css.taskMain}>
                  <span className={css.taskTitle}>{t.title}</span>
                  <span className={css.taskSub}>{t.sub}</span>
                  <AiNote>
                    {t.aiReason} · {t.aiPrepared}
                  </AiNote>
                </span>
              </ListGroupItem>
            ))}
          </ListGroup>
        </Widget>

        <aside className={css.rail}>
          <ScheduleWidget />
          <NoticeWidget />
        </aside>
      </div>
    </div>
  );
};
