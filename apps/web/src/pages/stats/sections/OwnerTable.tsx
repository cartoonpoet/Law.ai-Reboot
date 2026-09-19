import { DataTable, Widget } from "@lawkit/ui";
import type { ColumnDef } from "@lawkit/ui";
import type { CycleTimeOwner } from "@lawai/contracts";
import { formatDays } from "../cycleTimeView";
import * as css from "../stats.css";

interface OwnerTableProps {
  owners: CycleTimeOwner[];
}

const COLUMNS: ColumnDef<CycleTimeOwner>[] = [
  {
    accessorKey: "ownerName",
    header: "담당자",
    size: 180,
    cell: (info) =>
      info.row.original.ownerName ? (
        <span className={css.titleCell}>{info.row.original.ownerName}</span>
      ) : (
        <span className={css.emptyCell}>이름 없음</span>
      ),
  },
  {
    accessorKey: "doneCount",
    header: "끝낸 건",
    size: 104,
    cell: (info) => <span className={css.mutedCell}>{info.row.original.doneCount}건</span>,
  },
  {
    accessorKey: "avgDays",
    header: "평균 소요일",
    size: 120,
    cell: (info) => <span className={css.bodyCell}>{formatDays(info.row.original.avgDays)}</span>,
  },
];

/** 담당자별 — 그 기간에 끝낸 건 기준. 끝낸 건이 없으면 이 카드는 그리지 않는다. */
export const OwnerTable = ({ owners }: OwnerTableProps) => (
  <Widget title="담당자별" extra={<span className={css.cheadNote}>이 기간에 끝낸 건 기준</span>} flush>
    <div className={css.tableWrap}>
      <DataTable data={owners} columns={COLUMNS} getRowId={(row) => row.ownerId} />
    </div>
  </Widget>
);
