import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const wrap = style({ display: "flex", flexDirection: "column", gap: 6 });

export const hint = style({ margin: 0, fontSize: 12, color: c.textMuted });

export const list = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  maxHeight: 220,
  overflowY: "auto",
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 6,
});

export const item = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "100%",
  padding: "8px 12px",
  textAlign: "left",
  font: "inherit",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${c.neutralBorder}`,
  cursor: "pointer",
  selectors: { "&:hover": { background: c.neutralSurfaceAlt } },
});

export const title = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const meta = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const selected = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 12px",
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 6,
});

export const selectedMain = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });
