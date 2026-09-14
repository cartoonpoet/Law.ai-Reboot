import { Badge, Button, Callout, DdayBadge, ListGroup, ListGroupItem, Widget } from "@lawkit/ui";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { DashboardHeader } from "./DashboardHeader";
import { NoticeWidget, ScheduleWidget } from "./DashboardSideWidgets";
import { AI_BRIEF, CONTRACT_ROWS, TASKS } from "./mockDashboardData";
import type { TaskItem } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const MAX_ROWS = 3;

const MoreButton = () => (
  <Button size="small" variant="outline" color="secondary">
    전체보기
  </Button>
);

const TaskList = ({ tasks, emptyText }: { tasks: TaskItem[]; emptyText: string }) =>
  tasks.length === 0 ? (
    <p className={css.emptyText}>{emptyText}</p>
  ) : (
    <ListGroup variant="flush">
      {tasks.slice(0, MAX_ROWS).map((t) => (
        <ListGroupItem key={t.id} trailing={<DdayBadge date={t.due} />}>
          <span className={css.taskMain}>
            <span className={css.taskTitle}>{t.title}</span>
            <span className={css.taskSub}>{t.sub}</span>
          </span>
        </ListGroupItem>
      ))}
    </ListGroup>
  );

const MY_REVIEWS = CONTRACT_ROWS.filter((r) => r.owner === "손준호");

/**
 * C. 역할별 위젯 그리드 — 같은 크기의 카드 6개로 나눠 한눈에 훑는 형태.
 * 카드마다 최대 3건 + 전체보기, 숫자는 카드 배지로만 보여 중복 통계 줄을 없앴다.
 */
export const WidgetGridVariant = () => (
  <div className={css.page}>
    <DashboardHeader />

    <Callout intent="info" title="AI 오늘의 브리핑">
      {AI_BRIEF}
    </Callout>

    <div className={css.widgetGrid}>
      <Widget title="내 결재 차례" badge={TASKS.filter((t) => t.kind === "approval").length} flush extra={<MoreButton />}>
        <TaskList tasks={TASKS.filter((t) => t.kind === "approval")} emptyText="결재할 문서가 없어요" />
      </Widget>

      <Widget title="배정 필요" badge={TASKS.filter((t) => t.kind === "assign").length} flush extra={<MoreButton />}>
        <TaskList tasks={TASKS.filter((t) => t.kind === "assign")} emptyText="배정할 계약이 없어요" />
      </Widget>

      <Widget title="자문 · 송무" badge={TASKS.filter((t) => t.domain !== "계약").length} flush extra={<MoreButton />}>
        <TaskList tasks={TASKS.filter((t) => t.domain !== "계약")} emptyText="진행 중인 건이 없어요" />
      </Widget>

      <Widget title="내가 담당한 계약" badge={MY_REVIEWS.length} flush extra={<MoreButton />}>
        <ListGroup variant="flush">
          {MY_REVIEWS.slice(0, MAX_ROWS).map((r) => (
            <ListGroupItem key={r.id} trailing={<StatusBadge status={r.statusLabel} size="sm" />}>
              <span className={css.taskMain}>
                <span className={css.taskTitle}>{r.title}</span>
                <span className={css.taskSub}>
                  {r.counterparty} · <Badge tone="neutral" variant="muted">{r.code}</Badge>
                </span>
              </span>
            </ListGroupItem>
          ))}
        </ListGroup>
      </Widget>

      <ScheduleWidget />
      <NoticeWidget />
    </div>
  </div>
);
