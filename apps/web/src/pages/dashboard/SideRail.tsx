import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { Tag } from "../../components/ui/Tag";
import { SCHEDULE, NOTICES } from "./mock-data";
import type { ScheduleItem, Notice } from "./mock-data";

function dday(n: number): { t: string; c: string } {
  if (n === 0) return { t: "D-DAY", c: T.danger };
  if (n < 0) return { t: `D+${-n}`, c: T.faint };
  return { t: `D-${n}`, c: n <= 3 ? T.danger : n <= 7 ? T.warning : T.muted };
}

function ScheduleRow({ item, last }: { item: ScheduleItem; last: boolean }) {
  const d = dday(item.dleft);
  const tagColor = (
    { 송무: "neutral", 자문: "secondary", 계약: "primary" } as const
  )[item.tag];
  return (
    <div
      style={{
        display: "flex",
        gap: 11,
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${T.border}`,
      }}
    >
      <div style={{ width: 42, flexShrink: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: T.faint,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.date.slice(5)}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: d.c,
            marginTop: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {d.t}
        </div>
      </div>
      <div
        style={{
          width: 2,
          borderRadius: 1,
          background: d.c === T.muted ? T.border : d.c,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 3 }}>
          <Tag color={tagColor}>{item.tag}</Tag>
        </div>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: T.heading }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
          {item.body}
        </div>
      </div>
    </div>
  );
}

function NoticeRow({ item, last }: { item: Notice; last: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${T.border}`,
        cursor: "pointer",
      }}
    >
      <Tag color={item.tag === "릴리즈" ? "primary" : "neutral"}>
        {item.tag}
      </Tag>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: T.body,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.title}
      </span>
      {item.isNew && (
        <span
          style={{ fontSize: 9.5, fontWeight: 800, color: T.danger, flexShrink: 0 }}
        >
          N
        </span>
      )}
      <span
        style={{
          fontSize: 11.5,
          color: T.faint,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.date}
      </span>
    </div>
  );
}

function LinkMore() {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: T.muted,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "Pretendard",
      }}
    >
      전체보기
      <Icon
        name="chevronRight"
        size="sm"
        style={{ width: 12, height: 12 }}
      />
    </button>
  );
}

export function SideRail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title="일정 · 기한 임박" icon="calendar" badge={SCHEDULE.length}>
        {SCHEDULE.map((s, i) => (
          <ScheduleRow
            key={i}
            item={s}
            last={i === SCHEDULE.length - 1}
          />
        ))}
      </Panel>

      <Panel
        title="공지 · 새소식"
        icon="bell"
        actions={<LinkMore />}
      >
        {NOTICES.map((n, i) => (
          <NoticeRow key={i} item={n} last={i === NOTICES.length - 1} />
        ))}
      </Panel>
    </div>
  );
}
