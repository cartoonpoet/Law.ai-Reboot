import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 결재 대기함 시안 — 배치·간격은 lawkit(Stack·Grid·Card)이 맡고, 여기서는 글자 스타일만 둔다. */
const c = themeVars.color;

export const pageTitle = style({
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: c.textHeading,
  letterSpacing: "-0.025em",
});

export const grow = style({ flex: 1, minWidth: 0 });

// 왼쪽 목록 + 오른쪽 미리보기(lawkit Grid 는 같은 너비 칸이라 비대칭 배치만 여기서).
export const split = style({ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" });

export const cardTitle = style({ fontSize: 15, fontWeight: 700, color: c.textHeading });

// 선택된 줄은 lawkit 이 배경·글자색을 바꾸므로 목록 글자는 그 색을 따른다.
export const listTitle = style({ display: "block", fontSize: 13.5, fontWeight: 700, color: "inherit" });

export const listMeta = style({ display: "block", marginTop: 3, fontSize: 11.5, color: "inherit", opacity: 0.75 });

export const rowTitle = style({ fontSize: 13, fontWeight: 700, color: c.textHeading });

export const meta = style({ fontSize: 12, color: c.textMuted });

export const metaCode = style({ fontSize: 12, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const sectionLabel = style({ fontSize: 12, fontWeight: 700, color: c.textMuted });

export const factLabel = style({ fontSize: 11, fontWeight: 600, color: c.textDisabled });

export const factValue = style({ fontSize: 12.5, fontWeight: 600, color: c.textSecondary });

export const aiIcon = style({ width: 14, height: 14, flexShrink: 0, marginTop: 2 });

export const aiText = style({ fontSize: 12.5, lineHeight: 1.55 });

export const aiTone = styleVariants({
  danger: { color: c.accentDanger },
  warning: { color: c.accentWarningActive },
  info: { color: c.accentInfo },
});
