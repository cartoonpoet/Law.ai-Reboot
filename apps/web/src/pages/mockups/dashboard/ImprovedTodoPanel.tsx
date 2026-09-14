import { useState } from "react";
import { Avatar, Button, ChipsNavigation, DataTable, Icon, Tabs } from "@lawkit/ui";
import type { ColumnDef } from "@lawkit/ui";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Tag } from "../../../components/ui/Tag";
import { cx } from "../../contract/cx";
import { AiNote } from "./AiNote";
import { CONTRACTS, DOMAIN_TAG_COLOR, TODOS, getDday } from "./mockDashboardData";
import type { ContractRow } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const TABS = [
  { value: "todo", label: "내 할일", badge: TODOS.length },
  { value: "contract", label: "진행 중 계약", badge: CONTRACTS.length },
];

const FILTERS = [
  { value: "계약", label: "계약" },
  { value: "송무", label: "송무" },
  { value: "자문", label: "자문" },
];

const COLUMNS: ColumnDef<ContractRow>[] = [
  { accessorKey: "id", header: "관리번호", size: 130, cell: ({ row }) => <span className={css.codeText}>{row.original.id}</span> },
  {
    accessorKey: "name",
    header: "계약명",
    cell: ({ row }) => (
      <span className={css.contractName}>
        <span className={css.nameLine}>
          {row.original.secure && <Icon name="lock" size="sm" className={css.lockIcon} />}
          <span className={css.nameText}>{row.original.name}</span>
        </span>
        <AiNote>{row.original.aiHint}</AiNote>
      </span>
    ),
  },
  { accessorKey: "counter", header: "상대계약자", size: 140, cell: ({ row }) => <span className={css.cellText}>{row.original.counter}</span> },
  {
    accessorKey: "owner",
    header: "담당자",
    size: 100,
    cell: ({ row }) =>
      row.original.owner === "미배정" ? (
        <span className={css.unassigned}>미배정</span>
      ) : (
        <span className={css.ownerCell}>
          <Avatar initials={row.original.owner[0]} size="sm" />
          <span className={css.cellText}>{row.original.owner}</span>
        </span>
      ),
  },
  { accessorKey: "status", header: "상태", size: 120, cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
];

/**
 * 내 할일 / 진행 중 계약(개선) — 탭·필터·행 모양은 현재 그대로.
 * 빼기: 5건 목록에 과한 검색창·페이지네이션(검색은 계약 조회 화면 몫) → "전체보기" 링크 하나로.
 * 더하기: 행마다 AI 한 줄(왜 지금 · 준비된 것).
 */
export const ImprovedTodoPanel = () => {
  const [tab, setTab] = useState("todo");
  const [filter, setFilter] = useState<string | string[]>("");
  const selectedTypes = Array.isArray(filter) ? filter : [filter].filter(Boolean);
  const todos = TODOS.filter((t) => selectedTypes.length === 0 || selectedTypes.includes(t.type));
  const isTodoTab = tab === "todo";

  return (
    <section className={css.card} aria-label="내 할일">
      <div className={css.tabsWrap}>
        <Tabs size="medium" value={tab} onChange={setTab} items={TABS} />
      </div>

      {isTodoTab && (
        <div className={css.filterBar}>
          <ChipsNavigation allLabel="전체" value={filter} onChange={setFilter} items={FILTERS} />
        </div>
      )}

      {isTodoTab ? (
        <div className={css.todoList}>
          {todos.map((t) => {
            const dday = getDday(t.daysLeft);
            return (
              <div key={t.id} className={css.todoRow}>
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
                  <Button size="small" variant="outline" color="secondary">
                    {t.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={css.tablePad}>
          <DataTable data={CONTRACTS} columns={COLUMNS} getRowId={(r) => r.id} emptyText="조회된 계약이 없습니다." />
        </div>
      )}

      <div className={css.panelFoot}>
        <button type="button" className={css.linkMore}>
          {isTodoTab ? "할 일 전체보기" : "계약 조회에서 보기"}
          <Icon name="chevronRight" size="sm" className={css.linkIcon} />
        </button>
      </div>
    </section>
  );
};
