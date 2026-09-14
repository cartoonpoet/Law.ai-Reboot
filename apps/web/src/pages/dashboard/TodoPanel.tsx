import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, ChipsNavigation, Icon } from "@lawkit/ui";
import { AiNote } from "../../components/ui/AiNote";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Tag } from "../../components/ui/Tag";
import { cx } from "../contract/cx";
import { getDday } from "./dday";
import { DOMAIN_TAG_COLOR, TODOS } from "./mock-data";
import type { TodoItem } from "./mock-data";
import * as css from "./dashboard.css";

// 필터 칩은 할 일에 실제 있는 업무 종류에서 만든다 — 기능이 늘어도 여기를 고칠 필요가 없다.
const FILTERS = [...new Set(TODOS.map((t) => t.type))].map((type) => ({ value: type, label: type }));

interface TodoPanelProps {
  onOpen: (todo: TodoItem) => void;
}

/** 내 할일 — 계약·결재·자문·송무·인감·지식재산을 한 목록에서 기한순으로, 행마다 AI 한 줄(왜 지금 · 준비된 것). */
export const TodoPanel = ({ onOpen }: TodoPanelProps) => {
  const [filter, setFilter] = useState<string | string[]>("");
  const selectedTypes = Array.isArray(filter) ? filter : [filter].filter(Boolean);
  const todos = TODOS.filter((t) => selectedTypes.length === 0 || selectedTypes.includes(t.type)).toSorted(
    (a, b) => a.daysLeft - b.daysLeft,
  );

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
          <span className={css.countPill}>{TODOS.length}</span>
        </span>
        <span className={css.cardMeta}>기한순</span>
      </header>

      <div className={css.filterBar}>
        <ChipsNavigation allLabel="전체" value={filter} onChange={setFilter} items={FILTERS} />
      </div>

      <div className={css.todoList}>
        {todos.map((t) => {
          const dday = getDday(t.daysLeft);
          return (
            <div key={t.id} className={css.todoRow} onClick={() => onOpen(t)}>
              <div className={cx(css.ddayCol, css.ddayTone[dday.tone])}>{dday.label}</div>
              <div className={css.divider} />
              <div className={css.todoMain}>
                <div className={css.todoMeta}>
                  <Tag color={DOMAIN_TAG_COLOR[t.type]}>{t.type}</Tag>
                  <span className={css.todoId}>{t.id}</span>
                </div>
                <div className={css.todoTitle}>{t.title}</div>
                <AiNote>
                  {t.aiReason} · {t.aiPrepared}
                </AiNote>
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

      <div className={css.panelFoot}>
        <button type="button" className={css.linkMore}>
          할 일 전체보기
          <Icon name="chevronRight" size="sm" className={css.linkIcon} />
        </button>
      </div>
    </section>
  );
};
