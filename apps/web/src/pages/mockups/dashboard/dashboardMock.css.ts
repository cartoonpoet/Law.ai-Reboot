import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;
const NARROW = "screen and (max-width: 1100px)";

/* --- 시안 페이지 --- */
export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const controls = style({
  padding: "14px 16px",
  background: c.neutralSurface,
  border: `1px dashed ${c.neutralBorder}`,
  borderRadius: 8,
});

/* --- 공통: 대시보드 머리 --- */
export const header = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  paddingBottom: 14,
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const eyebrow = style({ fontSize: 12, fontWeight: 600, color: c.textMuted });
export const title = style({ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: c.textHeading, letterSpacing: "-0.02em" });

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const rail = style({ display: "flex", flexDirection: "column", gap: 16 });

/* --- 클릭 가능한 통계 칸(필터) --- */
export const statButton = style({
  cursor: "pointer",
  outline: "none",
  borderRadius: 8,
  selectors: { "&:focus-visible": { boxShadow: themeVars.shadow.focus } },
});

/* --- 할 일 행 --- */
export const taskMain = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });

export const taskTitle = style({
  fontSize: 13.5,
  fontWeight: 700,
  color: c.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const taskSub = style({ fontSize: 12, color: c.textMuted });
export const nowrap = style({ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });
export const trailing = style({ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 });

/* --- 오른쪽 레일 행(일정·공지) — LDS ListGroupItem 본문이 줄어들지 않아 폭을 직접 제한해 말줄임 --- */
export const railTitle = style({
  display: "block",
  maxWidth: 180,
  fontSize: 13,
  fontWeight: 600,
  color: c.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const scheduleDate = style({
  fontSize: 12,
  fontWeight: 700,
  color: c.textMuted,
  fontVariantNumeric: "tabular-nums",
  minWidth: 36,
});

export const noticeDate = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

/* --- C. 위젯 그리드 --- */
export const widgetGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } },
});

export const emptyText = style({ padding: "20px 0", textAlign: "center", fontSize: 12.5, color: c.textMuted });
