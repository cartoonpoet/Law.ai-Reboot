import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;
const dangerTint = `color-mix(in srgb, ${c.accentDanger} 12%, ${c.neutralSurface})`;
const dangerBorder = `color-mix(in srgb, ${c.accentDanger} 30%, ${c.neutralSurface})`;

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: c.textSecondary,
  lineHeight: 1.6,
});

export const textarea = style({
  width: "100%",
  fontFamily: "inherit",
  fontSize: 13,
  color: c.textHeading,
  border: `1px solid ${c.neutralBorderStrong}`,
  borderRadius: themeVars.radius.md,
  padding: "10px 12px",
  minHeight: 88,
  resize: "vertical",
  marginTop: 6,
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: c.accentPrimary,
      boxShadow: themeVars.shadow.focus,
    },
  },
});

export const warn = style({
  display: "flex",
  gap: 8,
  background: dangerTint,
  border: `1px solid ${dangerBorder}`,
  borderRadius: themeVars.radius.lg,
  padding: "10px 12px",
  fontSize: 12.5,
  color: c.accentDanger,
  marginTop: 12,
  lineHeight: 1.5,
});

export const warnIcon = style({ width: 15, height: 15, marginTop: 1, flexShrink: 0 });

export const footRow = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
});
