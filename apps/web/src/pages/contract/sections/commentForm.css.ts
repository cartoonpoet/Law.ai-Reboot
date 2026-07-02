import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const footRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
});

export const error = style({
  fontSize: 12,
  fontWeight: 600,
  color: themeVars.color.accentDanger,
});
