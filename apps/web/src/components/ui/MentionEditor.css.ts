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

export const area = style({
  minHeight: 76,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: themeVars.color.textHeading,
  outline: "none",
});

/* placeholder — @tiptap/extension-placeholder가 빈 첫 문단에 is-editor-empty 클래스 +
   data-placeholder 속성을 부여한다. ::before로 흐름 내부에 렌더돼 area의 padding/lineHeight를
   상속하므로 입력 텍스트의 시작 위치와 정확히 일치한다(절대배치 span baseline 어긋남 해소). */
globalStyle(`${area} p.is-editor-empty:first-child::before`, {
  content: "attr(data-placeholder)",
  color: themeVars.color.textMuted,
  float: "left",
  height: 0,
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
