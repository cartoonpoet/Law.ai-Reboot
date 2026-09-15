import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const head = style({ display: "flex", flexDirection: "column", gap: 4 });

export const title = style({ margin: 0, fontSize: 22, fontWeight: 800, color: c.textHeading, letterSpacing: "-0.025em" });

export const desc = style({ margin: 0, fontSize: 13, color: c.textSecondary });

export const tabs = style({ display: "flex", flexWrap: "wrap", gap: 6 });

export const tab = style({
  padding: "5px 14px",
  borderRadius: 999,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurface,
  color: c.textSecondary,
  font: "inherit",
  fontSize: 12.5,
  cursor: "pointer",
});

export const tabActive = style({ background: c.textHeading, borderColor: c.textHeading, color: c.neutralSurface, fontWeight: 700 });

export const card = style({
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 8,
  overflow: "hidden",
});

export const tableWrap = style({ overflowX: "auto" });

export const table = style({ width: "100%", borderCollapse: "collapse", fontSize: 12.5 });

export const th = style({
  textAlign: "left",
  padding: "9px 12px",
  fontSize: 11.5,
  fontWeight: 700,
  color: c.textMuted,
  background: c.neutralSurfaceAlt,
  borderBottom: `1px solid ${c.neutralBorder}`,
  whiteSpace: "nowrap",
});

export const td = style({
  padding: "11px 12px",
  borderBottom: `1px solid ${c.neutralBorder}`,
  verticalAlign: "top",
  color: c.textPrimary,
});

export const stack = style({ display: "flex", flexDirection: "column", gap: 3 });

export const dday = style({ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.textHeading });

export const ddayTone = styleVariants({
  hot: { color: c.accentDanger },
  soon: { color: c.accentWarningActive },
  calm: {},
});

export const sub = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const titleButton = style({
  padding: 0,
  border: "none",
  background: "transparent",
  font: "inherit",
  fontWeight: 700,
  color: c.textHeading,
  textAlign: "left",
  cursor: "pointer",
  selectors: { "&:hover": { color: c.accentPrimary, textDecoration: "underline" } },
});

export const aiHeadline = style({ fontSize: 12.5, fontWeight: 600 });

export const aiTone = styleVariants({
  warning: { color: c.accentWarningActive },
  info: { color: c.textPrimary },
});

export const actions = style({ display: "flex", flexWrap: "wrap", gap: 6 });

export const empty = style({ margin: 0, padding: "32px 16px", textAlign: "center", fontSize: 13, color: c.textSecondary });

export const note = style({ margin: 0, padding: "10px 12px", fontSize: 12, color: c.textMuted });
