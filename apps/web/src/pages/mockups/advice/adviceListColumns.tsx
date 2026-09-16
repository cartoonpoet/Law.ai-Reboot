import type { ColumnDef } from "@lawkit/ui";
import { Icon } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import { Badge } from "../../../components/ui/Badge";
import { Tag } from "../../../components/ui/Tag";
import { dday } from "../../dashboard/dday";
import { ADVICE_STATUS_COLOR, ADVICE_STATUS_LABEL, type AdviceRow } from "./advice-mock-data";
import * as listCss from "../../contract/contractList.css";

/** 자문 목록 컬럼 — 계약 목록(listColumns)과 같은 구성·같은 셀 스타일. */
export function adviceListColumns(): ColumnDef<AdviceRow>[] {
  return [
    {
      accessorKey: "code",
      header: "관리번호",
      size: 128,
      cell: (i) => (
        <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {i.row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "자문명",
      size: 260,
      cell: (i) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i.row.original.secure && (
            <Icon name="lock" size="sm" style={{ width: 12, height: 12, color: T.warning, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: T.heading }}>{i.row.original.title}</span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "자문분류",
      size: 120,
      cell: (i) => <Tag>{i.row.original.category}</Tag>,
    },
    {
      accessorKey: "region",
      header: "지역",
      size: 78,
      cell: (i) => <span style={{ fontSize: 12.5, color: T.body }}>{i.row.original.region}</span>,
    },
    {
      accessorKey: "requesterName",
      header: "요청자",
      size: 132,
      cell: (i) => (
        <div>
          <div style={{ fontSize: 12.5, color: T.body, fontWeight: 600 }}>{i.row.original.requesterName}</div>
          <div style={{ fontSize: 11.5, color: T.muted }}>{i.row.original.requesterDept}</div>
        </div>
      ),
    },
    {
      accessorKey: "ownerName",
      header: "담당",
      size: 104,
      cell: (i) =>
        i.row.original.ownerName ? (
          <span style={{ fontSize: 12.5, color: T.body }}>{i.row.original.ownerName}</span>
        ) : (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: T.warningDark }}>미배정</span>
        ),
    },
    {
      id: "due",
      header: "회신 기한",
      size: 96,
      cell: (i) => {
        const { daysLeft } = i.row.original;
        if (daysLeft === null) return <span className={listCss.emptyCell}>-</span>;
        const view = dday(daysLeft);
        return <span style={{ fontSize: 11.5, fontWeight: 800, color: view.c }}>{view.t}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "상태",
      size: 104,
      cell: (i) => (
        <Badge color={ADVICE_STATUS_COLOR[i.row.original.status]} size="sm" dot>
          {ADVICE_STATUS_LABEL[i.row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "requestedAt",
      header: "요청일",
      size: 100,
      cell: (i) => <span className={listCss.dateCell}>{i.row.original.requestedAt}</span>,
    },
  ];
}
