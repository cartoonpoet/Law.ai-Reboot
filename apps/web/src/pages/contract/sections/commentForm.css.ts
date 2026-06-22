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

/* 멘션 입력 영역 */
export const mentionWrap = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  position: "relative",
});

export const mentionSearchRow = style({ position: "relative" });

/* 후보 드롭다운 — 검색어가 있을 때만 렌더(선언적 조건부) */
export const mentionDropdown = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 5,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  maxHeight: 200,
  overflowY: "auto",
  padding: 6,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 10,
  boxShadow: `0 8px 24px color-mix(in srgb, ${themeVars.color.textHeading} 12%, transparent)`,
});

export const mentionOption = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: themeVars.color.textHeading,
  textAlign: "left",
  background: "transparent",
  border: "none",
  width: "100%",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 10%, ${surface})`,
    },
  },
});

export const mentionEmpty = style({
  padding: "10px",
  textAlign: "center",
  fontSize: 12.5,
  color: themeVars.color.textMuted,
});

/* 선택된 멘션 chip 목록 */
export const chipRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 6px 4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  color: themeVars.color.accentPrimary,
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 12%, ${surface})`,
  border: `1px solid color-mix(in srgb, ${themeVars.color.accentPrimary} 30%, transparent)`,
});

export const chipRemove = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 2,
  borderRadius: 999,
  cursor: "pointer",
  color: themeVars.color.accentPrimary,
  background: "transparent",
  border: "none",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 20%, transparent)`,
    },
  },
});
