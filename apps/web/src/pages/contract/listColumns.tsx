import type { ColumnDef } from "@lawkit/ui";
import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Tag } from "../../components/ui/Tag";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { dday } from "../dashboard/dday";
import type { ContractRow } from "./mock-data";
import * as listCss from "./contractList.css";

function StarCell({ on }: { on: boolean }) {
  return (
    <Icon
      name={on ? "starFill" : "star"}
      size="sm"
      style={{ width: 15, height: 15, color: on ? T.warning : T.borderStrong }}
    />
  );
}

export function listColumns(): ColumnDef<ContractRow>[] {
  return [
    {
      id: "star",
      header: "",
      size: 36,
      cell: (i) => <StarCell on={i.row.original.star} />,
    },
    {
      accessorKey: "id",
      header: "관리번호",
      size: 122,
      cell: (i) => (
        <span
          style={{
            fontSize: 12,
            color: T.muted,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {i.row.original.code ?? String(i.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "계약명",
      size: 240,
      cell: (i) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i.row.original.secure && (
            <Icon
              name="lock"
              size="sm"
              style={{ width: 12, height: 12, color: T.warning, flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {String(i.getValue())}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "party",
      header: "당사자",
      size: 84,
      cell: (i) => (
        <span style={{ fontSize: 12.5, color: T.body }}>
          {String(i.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "sub",
      header: "분류",
      size: 90,
      cell: (i) => <Tag color="neutral">{String(i.getValue())}</Tag>,
    },
    {
      accessorKey: "counter",
      header: "상대계약자",
      size: 150,
      cell: (i) => (
        <span
          style={{
            fontSize: 13,
            color: T.body,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {String(i.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "requester",
      header: "요청자",
      size: 84,
      cell: (i) => (
        <span style={{ fontSize: 12.5, color: T.body }}>
          {String(i.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "owner",
      header: "법무팀 담당자",
      size: 118,
      cell: (i) => {
        const v = String(i.getValue());
        return v === "미배정" ? (
          <span style={{ fontSize: 12, color: T.danger, fontWeight: 700 }}>
            미배정
          </span>
        ) : (
          <span style={{ fontSize: 13, color: T.body }}>{v}</span>
        );
      },
    },
    {
      accessorKey: "signedAt",
      header: "체결일",
      size: 96,
      cell: (i) => {
        const v = i.getValue();
        return v ? (
          <span className={listCss.dateCell}>{String(v)}</span>
        ) : (
          <span className={listCss.emptyCell}>—</span>
        );
      },
    },
    {
      accessorKey: "updated",
      header: "수정일",
      size: 100,
      cell: (i) => (
        <span
          style={{
            fontSize: 12,
            color: T.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(i.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "due",
      header: "검토기한",
      size: 116,
      cell: (i) => {
        const d = dday(i.row.original.dleft);
        return (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                fontSize: 12,
                color: T.muted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(i.getValue())}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: d.c,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.t}
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "진행상태",
      size: 122,
      cell: (i) => <StatusBadge status={String(i.getValue())} size="sm" />,
    },
  ];
}
