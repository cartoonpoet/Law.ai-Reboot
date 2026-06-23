import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;
const accent = themeVars.color.accentPrimary;

/* "(수정됨)" 표기 */
export const edited = style({
  fontSize: 11,
  color: themeVars.color.textMuted,
  fontStyle: "italic",
});

/* 본인 코멘트 액션 버튼(수정/삭제) */
export const actions = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginLeft: "auto",
});

export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 6px",
  borderRadius: 6,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  color: themeVars.color.textMuted,
  background: "transparent",
  border: "none",
  selectors: {
    "&:hover": {
      color: themeVars.color.textHeading,
      background: `color-mix(in srgb, ${themeVars.color.textHeading} 8%, transparent)`,
    },
  },
});

export const dangerButton = style({
  selectors: {
    "&:hover": {
      color: themeVars.color.accentDanger,
      background: `color-mix(in srgb, ${themeVars.color.accentDanger} 10%, transparent)`,
    },
  },
});

/* 삭제된 코멘트 placeholder(흐리게) */
export const deletedBubble = style({
  fontSize: 13,
  lineHeight: 1.6,
  fontStyle: "italic",
  color: themeVars.color.textMuted,
  background: `color-mix(in srgb, ${border} 30%, transparent)`,
  border: `1px dashed ${border}`,
  borderRadius: 8,
  padding: "10px 13px",
});

/* 본문 인라인 멘션 하이라이트(읽기 전용) — @이름 강조 */
export const mentionInline = style({
  fontWeight: 600,
  color: accent,
  background: `color-mix(in srgb, ${accent} 12%, ${surface})`,
  borderRadius: 4,
  padding: "0 3px",
});

/* 인라인 편집 폼 */
export const editForm = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const editActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
});

export const editError = style({
  fontSize: 12,
  fontWeight: 600,
  color: themeVars.color.accentDanger,
});
