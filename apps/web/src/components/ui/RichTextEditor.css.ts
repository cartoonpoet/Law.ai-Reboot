import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const wrap = style({ border: `1px solid ${themeVars.color.neutralBorderStrong}`, borderRadius: 8, overflow: "hidden" });
export const toolbar = style({ display: "flex", gap: 2, padding: "6px 8px", background: themeVars.color.neutralSurfaceAlt, borderBottom: `1px solid ${themeVars.color.neutralBorder}` });
export const tbBtn = style({
  minWidth: 28, height: 28, border: "none", background: "none", borderRadius: 4, cursor: "pointer",
  fontSize: 13, fontWeight: 700, color: themeVars.color.textSecondary,
  selectors: { "&[data-active='true']": { background: themeVars.color.neutralSurface, color: themeVars.color.accentPrimary } },
});
export const area = style({ minHeight: 96, padding: "10px 12px", fontSize: 13.5, color: themeVars.color.textHeading, outline: "none" });
