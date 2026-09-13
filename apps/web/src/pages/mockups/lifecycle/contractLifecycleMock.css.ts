import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const controls = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  padding: "14px 16px",
  background: c.neutralSurface,
  border: `1px dashed ${c.neutralBorder}`,
  borderRadius: 8,
});

export const statusDropdown = style({ width: 220 });

export const ghostWrap = style({ opacity: 0.5 });
export const ghostBody = style({ height: 140, margin: 16, borderRadius: 6, background: c.neutralSurfaceAlt });
