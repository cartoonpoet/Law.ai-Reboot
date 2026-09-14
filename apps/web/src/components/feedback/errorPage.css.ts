import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const wrap = style({
  display: "flex",
  justifyContent: "center",
  padding: "64px 16px",
});

export const icon = style({ color: themeVars.color.textMuted });

export const detail = style({
  display: "block",
  marginTop: 6,
  fontSize: 12,
  color: themeVars.color.neutralBorderStrong,
});

export const actions = style({
  display: "flex",
  justifyContent: "center",
  gap: 8,
});
