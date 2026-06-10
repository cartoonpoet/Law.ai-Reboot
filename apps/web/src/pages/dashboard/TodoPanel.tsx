import { useState } from "react";
import { Button, Icon, Tabs, ChipsNavigation, Input, DataTable, Pagination, PaginationCount, Avatar } from "@lawkit/ui";
import type { ColumnDef } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Tag } from "../../components/ui/Tag";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TODOS, CONTRACTS } from "./mock-data";
import type { Todo, Contract } from "./mock-data";
import { dday } from "./dday";

function TodoRow({ t, onOpen }: { t: Todo; onOpen?: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const d = dday(t.urgency);
  const typeTone = (
    { 계약: "primary", 자문: "secondary", 송무: "neutral" } as const
  )[t.type] ?? ("neutral" as const);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen?.(t.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 6,
        cursor: "pointer",
        background: hover ? T.surfaceAlt : "transparent",
        transition: "background .1s",
      }}
    >
      <div style={{ width: 38, textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: d.c,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {d.t}
        </div>
      </div>
      <div
        style={{
          width: 1,
          height: 24,
          background: T.border,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <Tag color={typeTone}>{t.type}</Tag>
          <span
            style={{
              fontSize: 11,
              color: T.faint,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.id}
          </span>
        </div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: T.heading,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t.title}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <StatusBadge status={t.status} size="sm" />
        <Button size="small" variant="outline" color="secondary" onClick={(e) => e.stopPropagation()}>
          {t.action}
        </Button>
      </div>
    </div>
  );
}

function contractColumns(): ColumnDef<Contract>[] {
  return [
    {
      accessorKey: "id",
      header: "관리번호",
      size: 130,
      cell: (info) => (
        <span
          style={{
            fontSize: 12,
            color: T.muted,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "계약명",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {info.row.original.secure && (
            <Icon
              name="lock"
              size="sm"
              style={{ width: 11, height: 11, color: T.warning, flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.heading,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {String(info.getValue())}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "counter",
      header: "상대계약자",
      size: 150,
      cell: (info) => (
        <span style={{ fontSize: 13, color: T.body }}>
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "owner",
      header: "담당자",
      size: 110,
      cell: (info) => {
        const v = String(info.getValue());
        return v === "미배정" ? (
          <span
            style={{ fontSize: 12.5, color: T.danger, fontWeight: 700 }}
          >
            미배정
          </span>
        ) : (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Avatar initials={v[0]} size="sm" />
            <span style={{ fontSize: 13, color: T.body }}>{v}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "due",
      header: "기한",
      size: 100,
      cell: (info) => (
        <span
          style={{
            fontSize: 12.5,
            color: T.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(info.getValue())}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      size: 130,
      cell: (info) => (
        <StatusBadge status={String(info.getValue())} size="sm" />
      ),
    },
  ];
}

export function TodoPanel({ onOpen }: { onOpen?: (id: string) => void }) {
  const [tab, setTab] = useState("todo");
  const [filter, setFilter] = useState<string | string[]>("");

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadowCard,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 14px 0" }}>
        <Tabs
          size="medium"
          value={tab}
          onChange={setTab}
          items={[
            { value: "todo", label: "내 할일", badge: TODOS.length },
            { value: "contract", label: "진행 중 계약", badge: CONTRACTS.length },
          ]}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: `1px solid ${T.border}`,
          borderTop: `1px solid ${T.border}`,
          marginTop: 10,
        }}
      >
        <ChipsNavigation
          allLabel="전체"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "계약", label: "계약" },
            { value: "송무", label: "송무" },
            { value: "자문", label: "자문" },
          ]}
        />
        <div style={{ flex: 1 }} />
        <div style={{ width: 196 }}>
          <Input
            inputSize="small"
            placeholder="관리번호·계약명 검색"
            leftIcon={
              <Icon
                name="search"
                size="sm"
                style={{ width: 14, height: 14, color: T.faint }}
              />
            }
          />
        </div>
      </div>

      {tab === "todo" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            padding: "5px 4px",
          }}
        >
          {TODOS.map((t) => (
            <TodoRow key={t.id} t={t} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 8 }}>
          <DataTable
            data={CONTRACTS}
            columns={contractColumns()}
            getRowId={(r) => r.id}
            emptyText="조회된 계약이 없습니다."
            onRowClick={(r) => onOpen?.(r.id)}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px 12px",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <PaginationCount
          totalCount={tab === "todo" ? TODOS.length : CONTRACTS.length}
        />
        <Pagination page={1} totalPages={1} onPageChange={() => {}} />
      </div>
    </div>
  );
}
