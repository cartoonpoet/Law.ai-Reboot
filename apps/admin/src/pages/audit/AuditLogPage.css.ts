import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const intro = style({
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
  margin: "0 0 14px",
});

export const filterBar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: 10,
  marginBottom: 14,
});

export const filterField = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 160,
});

export const filterLabel = style({
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
});

export const resultCount = style({
  fontSize: 12,
  color: themeVars.color.textSecondary,
  margin: "0 0 8px",
});

export const tableWrap = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  overflowX: "auto",
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
});

export const th = style({
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurfaceAlt,
  whiteSpace: "nowrap",
});

export const td = style({
  padding: "11px 14px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 12.5,
  color: themeVars.color.textPrimary,
  verticalAlign: "top",
});

export const timeCell = style([
  td,
  {
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    color: themeVars.color.textSecondary,
  },
]);

export const actionCell = style([td, { fontWeight: 700, whiteSpace: "nowrap" }]);

export const targetTitle = style({
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const mutedText = style({
  fontSize: 11.5,
  color: themeVars.color.textMuted,
});

export const emptyCell = style([
  td,
  {
    textAlign: "center",
    color: themeVars.color.textSecondary,
    padding: 28,
  },
]);

export const errorText = style({
  fontSize: 12,
  color: themeVars.color.accentDanger,
  margin: "10px 0 0",
});

export const pagerRow = style({
  display: "flex",
  justifyContent: "center",
  marginTop: 16,
});
