import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const border = themeVars.color.neutralBorder;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const row = style({
  display: "flex",
  gap: 11,
});

export const main = style({
  flex: 1,
  minWidth: 0,
});

export const head = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginBottom: 5,
});

export const author = style({
  fontSize: 13,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const time = style({
  fontSize: 11.5,
  color: themeVars.color.textMuted,
  fontVariantNumeric: "tabular-nums",
});

export const bubble = style({
  fontSize: 13,
  lineHeight: 1.6,
  color: themeVars.color.textSecondary,
  background: surfaceAlt,
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: "10px 13px",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const state = style({
  padding: "20px 4px",
  textAlign: "center",
  fontSize: 12.5,
  color: themeVars.color.textMuted,
});

export const formWrap = style({
  marginTop: 14,
  paddingTop: 14,
  borderTop: `1px solid ${border}`,
});
