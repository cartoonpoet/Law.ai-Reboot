import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { ColumnDef } from "@lawkit/ui";
import { Button, DataTable, DdayBadge, ListGroup, ListGroupItem, StatCell, StatGrid, Widget } from "@lawkit/ui";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { DashboardHeader } from "./DashboardHeader";
import { NoticeWidget } from "./DashboardSideWidgets";
import { CONTRACT_ROWS, PIPELINE, TASKS } from "./mockDashboardData";
import type { ContractRow } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const COLUMNS: ColumnDef<ContractRow>[] = [
  { accessorKey: "code", header: "관리번호", size: 150, cell: ({ row }) => <span className={css.nowrap}>{row.original.code}</span> },
  {
    accessorKey: "title",
    header: "계약명",
    cell: ({ row }) => (
      <span className={css.taskMain}>
        <span className={css.taskTitle}>{row.original.title}</span>
        <span className={css.taskSub}>{row.original.counterparty}</span>
      </span>
    ),
  },
  { accessorKey: "owner", header: "담당자", size: 80, cell: ({ row }) => <span className={css.nowrap}>{row.original.owner}</span> },
  { accessorKey: "due", header: "검토기한", size: 90, cell: ({ row }) => <DdayBadge date={row.original.due} /> },
  { accessorKey: "statusLabel", header: "상태", size: 120, cell: ({ row }) => <StatusBadge status={row.original.statusLabel} size="sm" /> },
];

const APPROVAL_TASKS = TASKS.filter((t) => t.kind === "approval" || t.kind === "assign");

/**
 * B. 파이프라인 보드 — 법무팀 관점. 단계별 건수 칸을 누르면 아래 목록이 그 단계로 좁혀진다.
 * 오른쪽은 내가 바로 처리해야 하는 결재·배정만 짧게.
 */
export const PipelineVariant = () => {
  const [stage, setStage] = useState<string>("unassigned");
  const rows = CONTRACT_ROWS.filter((r) => r.status === stage);
  const current = PIPELINE.find((p) => p.status === stage);

  const handleKeyDown = (status: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setStage(status);
    }
  };

  return (
    <div className={css.page}>
      <DashboardHeader />

      <Widget title="계약 파이프라인" extra={<span className={css.taskSub}>단계를 누르면 목록이 바뀌어요</span>}>
        <StatGrid>
          {PIPELINE.map((p) => (
            <StatCell
              key={p.status}
              label={p.label}
              value={p.count}
              valueColor={p.color}
              active={stage === p.status}
              role="button"
              tabIndex={0}
              aria-pressed={stage === p.status}
              className={css.statButton}
              onClick={() => setStage(p.status)}
              onKeyDown={handleKeyDown(p.status)}
            />
          ))}
        </StatGrid>
      </Widget>

      <div className={css.mainGrid}>
        <Widget
          title={`${current?.label ?? ""} 계약 · 최근`}
          badge={current?.count}
          flush
          extra={
            <Button size="small" variant="outline" color="secondary">
              계약 조회에서 보기
            </Button>
          }
        >
          <DataTable<ContractRow>
            data={rows}
            columns={COLUMNS}
            getRowId={(r) => r.id}
            emptyText="이 단계의 계약이 없어요"
          />
        </Widget>

        <aside className={css.rail}>
          <Widget title="내가 처리할 결재·배정" badge={APPROVAL_TASKS.length} flush>
            <ListGroup variant="flush">
              {APPROVAL_TASKS.map((t) => (
                <ListGroupItem key={t.id} trailing={<DdayBadge date={t.due} />}>
                  <span className={css.taskMain}>
                    <span className={css.taskTitle}>{t.title}</span>
                    <span className={css.taskSub}>{t.sub}</span>
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          </Widget>
          <NoticeWidget />
        </aside>
      </div>
    </div>
  );
};
