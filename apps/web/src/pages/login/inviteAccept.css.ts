import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const inviteBox = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: themeVars.radius.lg,
  border: `1px solid ${themeVars.color.accentPrimary}`,
  background: themeVars.color.neutralSurfaceAlt,
  marginBottom: 18,
});

export const inviteBadge = style({
  width: 32,
  height: 32,
  borderRadius: themeVars.radius.md,
  background: themeVars.color.accentPrimary,
  color: themeVars.color.textInverse,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 800,
  flexShrink: 0,
});

export const inviteText = style({
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
  lineHeight: 1.5,
});

export const successCol = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const errText = style({
  marginTop: 5,
  fontSize: 12,
  color: themeVars.color.accentDanger,
});

export const successText = style({
  margin: 0,
  fontSize: 13,
  color: themeVars.color.textPrimary,
  lineHeight: 1.6,
});
