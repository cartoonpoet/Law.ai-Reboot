import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const textarea = style({
  width: "100%",
  minHeight: 76,
  resize: "vertical",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.6,
  fontFamily: "Pretendard",
  color: themeVars.color.textHeading,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 8,
  outline: "none",
  selectors: {
    "&:focus": {
      borderColor: themeVars.color.accentPrimary,
      boxShadow: `0 0 0 3px color-mix(in srgb, ${themeVars.color.accentPrimary} 14%, transparent)`,
    },
    "&::placeholder": { color: themeVars.color.textMuted },
  },
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
