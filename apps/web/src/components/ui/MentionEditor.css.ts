import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/** 멘션 칩 DOM 클래스 — MentionEditor.tsx의 HTMLAttributes.class와 1:1 공유(드리프트 방지). */
export const MENTION_CLASS = "lawai-mention";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;
const accent = themeVars.color.accentPrimary;

/* 에디터 컨테이너 — RichTextEditor.css.ts의 wrap/area 패턴 차용. */
export const wrap = style({
  border: `1px solid ${border}`,
  borderRadius: 8,
  background: surface,
  overflow: "hidden",
  selectors: {
    "&:focus-within": {
      borderColor: accent,
      boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)`,
    },
  },
});

/* 입력 영역을 감싸 placeholder 오버레이를 절대배치하기 위한 relative 컨테이너. */
export const editArea = style({ position: "relative" });

export const area = style({
  minHeight: 76,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: themeVars.color.textHeading,
  outline: "none",
});

/* 빈 에디터 placeholder — 에디터 비었을 때만 조건부 렌더(선언적). */
export const placeholder = style({
  position: "absolute",
  top: 10,
  left: 12,
  fontSize: 13.5,
  lineHeight: 1.6,
  color: themeVars.color.textMuted,
  pointerEvents: "none",
});

/* 멘션 칩 — 에디터 내부 인라인 노드(MentionEditor가 MENTION_CLASS 부여).
   contenteditable 안에서 렌더되므로 globalStyle로 노드 셀렉터에 토큰을 적용한다(인라인 금지 준수). */
globalStyle(`${area} .${MENTION_CLASS}`, {
  display: "inline",
  padding: "1px 4px",
  borderRadius: 5,
  fontWeight: 600,
  color: accent,
  background: `color-mix(in srgb, ${accent} 12%, ${surface})`,
  whiteSpace: "nowrap",
});

/* suggestion 드롭다운 — useMentionSuggestion의 MentionList가 포털로 마운트해 사용. */
export const dropdown = style({
  position: "fixed",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 200,
  maxWidth: 320,
  maxHeight: 240,
  overflowY: "auto",
  padding: 6,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 10,
  boxShadow: `0 8px 24px color-mix(in srgb, ${themeVars.color.textHeading} 12%, transparent)`,
});

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "left",
  color: themeVars.color.textHeading,
  background: "transparent",
  selectors: {
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${accent} 12%, ${surface})`,
      color: accent,
    },
    "&:hover": {
      background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
    },
  },
});

export const optionDept = style({
  marginLeft: "auto",
  fontSize: 11.5,
  fontWeight: 500,
  color: themeVars.color.textMuted,
});

export const empty = style({
  padding: "10px",
  textAlign: "center",
  fontSize: 12.5,
  color: themeVars.color.textMuted,
});
