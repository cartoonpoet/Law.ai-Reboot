import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const page = style({ padding: 24, maxWidth: 640 });

export const headRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
});

export const title = style({
  fontSize: 18,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const card = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: themeVars.radius.lg,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const cardHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "space-between",
});

export const cardTitle = style({
  fontSize: 13.5,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const label = style({
  fontSize: 12.5,
  fontWeight: 600,
  color: themeVars.color.textSecondary,
});

export const helper = style({ fontSize: 11.5, color: themeVars.color.textSecondary });

export const errorText = style({ fontSize: 12, color: themeVars.color.accentDanger });

export const empty = style({
  padding: 16,
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
});

export const saveRow = style({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 4,
});

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: themeVars.radius.sm,
  fontSize: 11.5,
  fontWeight: 700,
});

export const badgeState = styleVariants({
  ok: {
    color: themeVars.color.accentSuccess,
    background: themeVars.color.neutralSurfaceAlt,
  },
  none: {
    color: themeVars.color.accentWarning,
    background: themeVars.color.neutralSurfaceAlt,
  },
});

export const badgeDot = style({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "currentColor",
});
