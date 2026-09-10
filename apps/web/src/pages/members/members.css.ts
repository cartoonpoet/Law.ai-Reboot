import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const page = style({ padding: 24, maxWidth: 1000 });

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

export const grow = style({ flex: 1 });

export const card = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: themeVars.radius.lg,
  overflow: "hidden",
  marginBottom: 16,
});

export const cardHead = style({
  padding: "12px 16px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 13.5,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const table = style({ width: "100%", borderCollapse: "collapse" });

export const th = style({
  textAlign: "left",
  padding: "9px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
  background: themeVars.color.neutralSurfaceAlt,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
});

export const td = style({
  padding: "10px 14px",
  fontSize: 12.5,
  color: themeVars.color.textPrimary,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
});

export const emailCell = style({ fontWeight: 600, color: themeVars.color.textHeading });

export const empty = style({
  padding: 16,
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
});

export const linkButton = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 700,
  color: themeVars.color.accentPrimary,
});

export const dangerLinkButton = style([
  linkButton,
  { color: themeVars.color.accentDanger },
]);

export const modalBody = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const textarea = style({
  width: "100%",
  minHeight: 90,
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: themeVars.radius.md,
  border: `1px solid ${themeVars.color.neutralBorderStrong}`,
  color: themeVars.color.textPrimary,
  background: themeVars.color.neutralSurface,
});

export const helper = style({ fontSize: 11.5, color: themeVars.color.textSecondary });

export const errorText = style({ fontSize: 12, color: themeVars.color.accentDanger });

export const resultText = style({ fontSize: 12, color: themeVars.color.textSecondary });
