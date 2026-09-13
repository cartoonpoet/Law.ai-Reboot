import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const fieldLabel = style({
  fontSize: 12.5,
  fontWeight: 700,
  color: c.textHeading,
  marginBottom: 6,
});

export const required = style({
  color: c.accentDanger,
  marginLeft: 3,
});

export const uploadNotice = style({
  fontSize: 12,
  color: c.textMuted,
  lineHeight: 1.5,
  margin: "0 0 8px",
});

export const fileList = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 10,
});

export const textarea = style({
  width: "100%",
  fontFamily: "inherit",
  fontSize: 13,
  color: c.textHeading,
  border: `1px solid ${c.neutralBorderStrong}`,
  borderRadius: themeVars.radius.md,
  padding: "10px 12px",
  minHeight: 58,
  resize: "vertical",
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: c.accentPrimary,
      boxShadow: themeVars.shadow.focus,
    },
  },
});

export const error = style({
  fontSize: 12.5,
  color: c.accentDanger,
  margin: 0,
});

export const footRow = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
});
