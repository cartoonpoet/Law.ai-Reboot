import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { ColumnDef } from "@lawkit/ui";
import { Button, DataTable, DdayBadge, ListGroup, ListGroupItem, StatCell, StatGrid, Widget } from "@lawkit/ui";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
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
        <AiNote>{row.original.aiHint}</AiNote>
      </span>
    ),
  },
  { accessorKey: "owner", header: "담당자", size: 80, cell: ({ row }) => <span className={css.nowrap}>{row.original.owner}</span> },
  { accessorKey: "due", header: "검토기한", size: 90, cell: ({ row }) => <DdayBadge date={row.original.due} /> },
  { accessorKey: "statusLabel", header: "상태", size: 120, cell: ({ row }) => <StatusBadge status={row.original.statusLabel} size="sm" /> },
];

const MY_ACTIONS = TASKS.filter((t) => t.kind === "approval" || t.kind === "assign");

/**
 * F. 파이프라인 + AI 병목 분석 — 법무팀 관리자용. 단계를 고르면 AI 가 그 단계가 왜 막히는지와 해법을 먼저 말하고,
 * 아래 표의 계약마다 AI 한 줄 판단이 붙는다.
 */
export const PipelineVariant = () => {
  const [stage, setStage] = useState<string>("unassigned");
  const rows = CONTRACT_ROWS.filter((r) => r.status === stage);
  const current = PIPELINE.find((p) => p.status === stage) ?? PIPELINE[0];

  const handleKeyDown = (status: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setStage(status);
    }
  };

  return (
    <div className={css.page}>
      <DashboardHeader />

      <Widget title="계약 파이프라인" extra={<span className={css.taskSub}>단계를 누르면 AI 분석과 목록이 바뀌어요</span>} flush>
        <div className={css.widgetBody}>
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
          <AiNote>{current.aiInsight}</AiNote>
        </div>
      </Widget>

      <div className={css.mainGrid}>
        <Widget
          title={`${current.label} 계약 · 최근`}
          badge={current.count}
          flush
          extra={
            <Button size="small" variant="outline" color="secondary">
              계약 조회에서 보기
            </Button>
          }
        >
          <DataTable<ContractRow> data={rows} columns={COLUMNS} getRowId={(r) => r.id} emptyText="이 단계의 계약이 없어요" />
        </Widget>

        <aside className={css.rail}>
          <Widget title="내가 처리할 결재·배정" badge={MY_ACTIONS.length} flush>
            <ListGroup variant="flush">
              {MY_ACTIONS.map((t) => (
                <ListGroupItem key={t.id} trailing={<DdayBadge date={t.due} />}>
                  <span className={css.taskMain}>
                    <span className={css.railTitle}>{t.title}</span>
                    <AiNote>{t.aiPrepared}</AiNote>
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          </Widget>
        </aside>
      </div>
    </div>
  );
};
