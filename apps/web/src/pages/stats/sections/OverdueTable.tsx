import { useNavigate } from "react-router-dom";
import { DataTable, Widget } from "@lawkit/ui";
import type { ColumnDef } from "@lawkit/ui";
import type { CycleTimeOverdueRow, CycleTimeStatsResponse } from "@lawai/contracts";
import { Badge } from "../../../components/ui/Badge";
import { getTargetPath } from "../cycleTimeView";
import * as css from "../stats.css";

interface OverdueTableProps {
  targetType: CycleTimeStatsResponse["targetType"];
  rows: CycleTimeOverdueRow[];
}

const createColumns = (titleHeader: string): ColumnDef<CycleTimeOverdueRow>[] => [
  {
    accessorKey: "code",
    header: "관리번호",
    size: 138,
    cell: (info) => <span className={css.codeCell}>{info.row.original.code}</span>,
  },
  {
    accessorKey: "title",
    header: titleHeader,
    size: 300,
    cell: (info) => <span className={css.titleCell}>{info.row.original.title}</span>,
  },
  {
    accessorKey: "statusLabel",
    header: "멈춰 있는 단계",
    size: 140,
    cell: (info) => (
      <Badge color="warning" size="sm" dot>
        {info.row.original.statusLabel}
      </Badge>
    ),
  },
  {
    accessorKey: "days",
    header: "멈춰 있던 기간",
    size: 104,
    cell: (info) => <span className={css.overdueDays}>{info.row.original.days}일</span>,
  },
  {
    accessorKey: "targetDays",
    header: "목표",
    size: 72,
    cell: (info) => <span className={css.mutedCell}>{info.row.original.targetDays}일</span>,
  },
  {
    accessorKey: "ownerName",
    header: "담당자",
    size: 104,
    cell: (info) =>
      info.row.original.ownerName ? (
        <span className={css.bodyCell}>{info.row.original.ownerName}</span>
      ) : (
        <span className={css.emptyCell}>미배정</span>
      ),
  },
];

/** 목표일을 넘겨 지금 멈춰 있는 건 — 누르면 해당 상세로 간다. */
export const OverdueTable = ({ targetType, rows }: OverdueTableProps) => {
  const navigate = useNavigate();

  return (
    <Widget
      title="목표일 넘긴 건"
      extra={<span className={css.cheadNote}>지금 멈춰 있는 건 · 오래 멈춘 순서 · 최대 20건</span>}
      flush
    >
      <div className={css.tableWrap}>
        <DataTable
          data={rows}
          columns={createColumns(targetType === "contract" ? "계약명" : "자문명")}
          getRowId={(row) => row.targetId}
          onRowClick={(row) => navigate(getTargetPath(targetType, row.targetId))}
          emptyText="목표일을 넘긴 건이 없습니다."
        />
      </div>
    </Widget>
  );
};
