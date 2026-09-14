import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, ChipsNavigation, Icon } from "@lawkit/ui";
import { AiInsightNote } from "../../components/ai/AiInsightNote";
import type { AiInsight } from "../../components/ai/summarizeAiAnalysis";
import { getAiTargetKey } from "../../components/ai/useAiInsights";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Tag } from "../../components/ui/Tag";
import { cx } from "../contract/cx";
import { getDday } from "./dday";
import { TODO_TAG_COLOR } from "./dashboardTypes";
import type { TodoItem } from "./dashboardTypes";
import * as css from "./dashboard.css";

interface TodoPanelProps {
  todos: TodoItem[];
  // 할 일의 AI 분석 한 줄(getAiTargetKey → 요약, 없으면 null)
  insights: Record<string, AiInsight | null>;
  isLoading: boolean;
  onOpen: (todo: TodoItem) => void;
}

/** 내 할일 — 내가 처리할 계약·결재를 기한순 한 목록으로, 실제 AI 분석이 있으면 한 줄로. 필터 칩은 목록의 업무 종류에서 만든다. */
export const TodoPanel = ({ todos, insights, isLoading, onOpen }: TodoPanelProps) => {
  const [filter, setFilter] = useState<string | string[]>("");
  const filters = [...new Set(todos.map((t) => t.type))].map((type) => ({ value: type, label: type }));
  const selectedTypes = Array.isArray(filter) ? filter : [filter].filter(Boolean);
  const visibleTodos = todos.filter((t) => selectedTypes.length === 0 || selectedTypes.includes(t.type));

  const handleActionClick = (todo: TodoItem) => (e: MouseEvent) => {
    e.stopPropagation();
    onOpen(todo);
  };

  return (
    <section className={css.card} aria-label="내 할일">
      <header className={css.cardHead}>
        <span className={css.cardTitle}>
          <Icon name="checkCircle" size="sm" className={css.cardTitleIcon} />
          내 할일
          {!isLoading && <span className={css.countPill}>{todos.length}</span>}
        </span>
        <span className={css.cardMeta}>기한순</span>
      </header>

      {filters.length > 1 && (
        <div className={css.filterBar}>
          <ChipsNavigation allLabel="전체" value={filter} onChange={setFilter} items={filters} />
        </div>
      )}

      {visibleTodos.length === 0 ? (
        <div className={css.emptyState}>{isLoading ? "할 일을 불러오는 중이에요" : "지금 처리할 일이 없어요"}</div>
      ) : (
        <div className={css.todoList}>
          {visibleTodos.map((t) => {
            const dday = t.daysLeft === null ? null : getDday(t.daysLeft);
            const insight = t.aiTarget ? insights[getAiTargetKey(t.aiTarget)] : null;
            return (
              <div key={t.key} className={css.todoRow} onClick={() => onOpen(t)}>
                <div className={cx(css.ddayCol, css.ddayTone[dday?.tone ?? "faint"])}>{dday?.label ?? "—"}</div>
                <div className={css.divider} />
                <div className={css.todoMain}>
                  <div className={css.todoMeta}>
                    <Tag color={TODO_TAG_COLOR[t.type]}>{t.type}</Tag>
                    {t.code && <span className={css.todoId}>{t.code}</span>}
                  </div>
                  <div className={css.todoTitle}>{t.title}</div>
                  {insight && <AiInsightNote insight={insight} />}
                </div>
                <div className={css.todoSide}>
                  <StatusBadge status={t.status} size="sm" />
                  <Button size="small" variant="outline" color="secondary" onClick={handleActionClick(t)}>
                    {t.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
