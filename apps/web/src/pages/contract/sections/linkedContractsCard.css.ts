import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const list = style({ display: "flex", flexDirection: "column", gap: 8 });

export const row = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "9px 11px",
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 6,
  textDecoration: "none",
  selectors: { "&:hover": { background: c.neutralSurfaceAlt } },
});

export const label = style({ fontSize: 11, fontWeight: 700, color: c.textMuted });

export const title = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const meta = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });
