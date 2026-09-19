import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 업무 통계 — 카드는 LDS Widget 을 쓰고, 여기서는 막대·표의 글자와 배치만 둔다. */

const c = themeVars.color;
const NARROW = "screen and (max-width: 980px)";

export const filters = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" });

export const filterSelect = style({ width: 150 });

export const filterSpacer = style({ flex: 1 });

export const rangeText = style({
  fontSize: 12.5,
  color: c.textMuted,
  fontVariantNumeric: "tabular-nums",
});

export const countNote = style({
  margin: "0 0 14px",
  fontSize: 12,
  color: c.textMuted,
  lineHeight: 1.5,
});

export const sections = style({ display: "flex", flexDirection: "column", gap: 16 });

/* 다른 조건으로 다시 불러오는 중 — 이전 숫자를 흐리게 해서 눌린 것을 알린다. */
export const refetching = style({
  opacity: 0.55,
  transition: "opacity .15s ease",
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});

/* Widget 안의 막대 줄들 — 카드 자체는 LDS Widget 이 그린다. */
export const barList = style({ display: "flex", flexDirection: "column" });

/* 표를 Widget(flush) 안에 넣을 때 가로 스크롤만 허용한다. */
export const tableWrap = style({ overflowX: "auto", padding: 6 });

/* Widget 머리 오른쪽에 붙는 보조 문구. */
export const cheadNote = style({ fontSize: 11.5, fontWeight: 500, color: c.textMuted });

/* --- 단계별 막대 --- */
export const barRow = style({
  display: "grid",
  // 오른쪽 두 칸은 "평균/목표"와 "멈춰 있는 건/목표일 넘김" — 글자가 길어 겹치지 않게 넉넉히 준다.
  gridTemplateColumns: "148px minmax(0, 1fr) 96px 176px",
  alignItems: "center",
  gap: 14,
  padding: "11px 0",
  borderTop: `1px solid ${c.neutralBorder}`,
  selectors: { "&:first-child": { borderTop: "none", paddingTop: 2 } },
  "@media": {
    [NARROW]: { gridTemplateColumns: "minmax(0, 1fr) 104px", rowGap: 6 },
  },
});

export const barName = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const barTrack = style({
  minWidth: 0,
  "@media": { [NARROW]: { gridColumn: "1 / -1" } },
});

export const barNone = style({ fontSize: 12, color: c.textDisabled });

export const barNums = style({ display: "flex", flexDirection: "column", gap: 2, textAlign: "right" });

const barAvgBase = style({ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" });

export const barAvg = styleVariants({
  over: [barAvgBase, { color: c.accentDangerActive }],
  within: [barAvgBase, { color: c.textHeading }],
  none: [barAvgBase, { color: c.textDisabled, fontWeight: 600 }],
});

export const barTarget = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const barSide = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  justifyContent: "flex-end",
  flexWrap: "wrap",
});

export const barSideText = style({ fontSize: 11.5, color: c.textMuted, whiteSpace: "nowrap" });

/* --- 월별 추이 --- */
export const monthRow = style({
  display: "grid",
  gridTemplateColumns: "104px minmax(0, 1fr) 104px",
  alignItems: "center",
  gap: 14,
  padding: "11px 0",
  borderTop: `1px solid ${c.neutralBorder}`,
  selectors: { "&:first-child": { borderTop: "none", paddingTop: 2 } },
});

export const monthName = style({ fontSize: 13, fontWeight: 600, color: c.textHeading, fontVariantNumeric: "tabular-nums" });

export const monthDone = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

/* --- 표 셀 --- */
export const codeCell = style({
  fontSize: 12,
  color: c.textMuted,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const titleCell = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const bodyCell = style({ fontSize: 12.5, color: c.textSecondary });

export const mutedCell = style({ fontSize: 12, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const overdueDays = style({ fontSize: 12.5, fontWeight: 800, color: c.accentDangerActive, fontVariantNumeric: "tabular-nums" });

export const emptyCell = style({ fontSize: 12, color: c.textMuted });

/* --- 빈 상태 · 불러오는 중 --- */
export const emptyWrap = style({ padding: "16px 0 8px" });

export const skeletonStack = style({ display: "flex", flexDirection: "column", gap: 10 });
