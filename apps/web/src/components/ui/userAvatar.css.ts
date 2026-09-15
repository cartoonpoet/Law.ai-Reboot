import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const base = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  overflow: "hidden",
  background: c.accentPrimary,
  color: c.textInverse,
  fontWeight: 700,
});

export const size = styleVariants({
  small: { width: 30, height: 30, borderRadius: 7, fontSize: 13 },
  large: { width: 72, height: 72, borderRadius: 18, fontSize: 28 },
});

export const image = style({ objectFit: "cover", background: c.neutralSurfaceAlt });
