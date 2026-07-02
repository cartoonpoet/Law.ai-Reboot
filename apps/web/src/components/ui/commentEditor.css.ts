import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { MENTION_CLASS } from "./MentionEditor.css";

/**
 * 코멘트 컴팩트 에디터 스타일 — 시안(comment-section-mockup.html) `.editor` 룩 매핑.
 * P1 RichTextEditor.css.ts 패턴(tbtn/group/sep/툴팁/콘텐츠 globalStyle/editorBar) 차용 +
 * 컴팩트 패딩(11/13)·작은 버튼(28×28)·아이콘(15×15)으로 토큰값만 조정.
 */

const accent = themeVars.color.accentPrimary;
const accentActive = themeVars.color.accentPrimaryActive;
const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;
/* "faint"는 시안의 더 흐린 textDisabled 토큰 — placeholder/charcount/dndhint 등에 사용. */
const faint = themeVars.color.textDisabled;

/* 에디터 박스 — 시안 .editor: border·radius·focus-within ring. */
export const wrap = style({
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.lg,
  background: surface,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
  transition: "border-color .12s, box-shadow .12s",
  position: "relative",
  selectors: {
    "&:focus-within": {
      borderColor: accent,
      boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)`,
    },
  },
});

/* 컴팩트 툴바 — 시안 .ed-toolbar(padding 6 13). */
export const toolbar = style({
  display: "flex",
  alignItems: "center",
  gap: 3,
  flexWrap: "wrap",
  padding: "6px 13px",
  borderBottom: `1px solid ${border}`,
  background: `color-mix(in srgb, ${surfaceAlt} 55%, ${surface})`,
});

export const group = style({ display: "inline-flex", alignItems: "center", gap: 2 });

export const sep = style({
  width: 1,
  alignSelf: "stretch",
  margin: "4px 5px",
  background: border,
});

/* 컴팩트 아이콘 버튼 — 시안 .tbtn-ic 28×28. hover/active(on)·툴팁(data-tip). */
export const tbtn = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: themeVars.radius.md,
  color: muted,
  background: "transparent",
  border: "1px solid transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  transition: "background .12s, color .12s, border-color .12s",
  selectors: {
    "&:hover:not(:disabled)": {
      background: surface,
      color: accentActive,
      borderColor: border,
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)`,
    },
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
      color: accentActive,
      borderColor: `color-mix(in srgb, ${accent} 22%, ${surface})`,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.45,
    },
    /* 툴팁 — RichTextEditor.css.ts와 동일 패턴(accentDark 토큰). */
    "&[data-tip]:hover::after": {
      content: "attr(data-tip)",
      position: "absolute",
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
      background: themeVars.color.accentDark,
      color: themeVars.color.textInverse,
      fontSize: 10.5,
      fontWeight: 600,
      whiteSpace: "nowrap",
      padding: "3px 7px",
      borderRadius: themeVars.radius.sm,
      zIndex: 9,
      pointerEvents: "none",
      boxShadow: themeVars.shadow.raised,
    },
  },
});

/* B/I/U/S 글리프 — span으로 텍스트 표시. */
export const glyph = style({
  fontWeight: 800,
  fontSize: 13,
  selectors: {
    "i&": { fontStyle: "italic", fontWeight: 600 },
    "u&": { textDecoration: "underline" },
    "s&": { textDecoration: "line-through" },
  },
});

/* 컴팩트 콘텐츠 — 시안 .ed-content padding(11/13), min-height 72. */
export const area = style({
  padding: "11px 13px",
  fontSize: 13,
  lineHeight: 1.65,
  color: themeVars.color.textSecondary,
  minHeight: 72,
  outline: "none",
});

/* 하단 바 — pasteHint + charcount + 등록 버튼. */
export const editorBar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 13px",
  borderTop: `1px solid ${border}`,
  background: `color-mix(in srgb, ${surfaceAlt} 35%, ${surface})`,
});

export const pasteHint = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  color: muted,
});

export const hintIcon = style({ width: 13, height: 13, color: themeVars.color.accentInfo, flexShrink: 0 });

export const spacer = style({ flex: 1 });

export const charCount = style({
  fontSize: 11,
  color: faint,
  fontVariantNumeric: "tabular-nums",
});

/* placeholder — extension-placeholder가 빈 첫 문단에 is-editor-empty + data-placeholder 부여. */
globalStyle(`${area} p.is-editor-empty:first-child::before`, {
  content: "attr(data-placeholder)",
  color: faint,
  float: "left",
  height: 0,
  pointerEvents: "none",
});

/* contenteditable 내부 노드 — 시안 컴팩트 룰을 토큰으로(인라인 0). h1-3은 제외(컴팩트). */
globalStyle(`${area} p`, { margin: "0 0 8px" });
globalStyle(`${area} > p:last-child`, { marginBottom: 0 });
globalStyle(`${area} strong`, { fontWeight: 700, color: heading });
globalStyle(`${area} em`, { fontStyle: "italic" });
globalStyle(`${area} h4`, { margin: "10px 0 4px", fontSize: 13.5, fontWeight: 700, color: heading });
globalStyle(`${area} ul, ${area} ol`, { margin: "4px 0 8px", paddingLeft: 20 });
globalStyle(`${area} li`, { margin: "2px 0" });
globalStyle(`${area} a`, { color: accent, textDecoration: "underline" });
globalStyle(`${area} blockquote`, {
  margin: "6px 0",
  padding: "4px 12px",
  borderLeft: `3px solid color-mix(in srgb, ${accent} 40%, ${surface})`,
  background: `color-mix(in srgb, ${accent} 6%, ${surface})`,
  color: themeVars.color.textSecondary,
  borderRadius: `0 ${themeVars.radius.sm} ${themeVars.radius.sm} 0`,
});

/* 멘션 칩(에디터 안) — class와 data-mention 양쪽 셀렉터를 OR로 매칭해 강조. */
globalStyle(`${area} .${MENTION_CLASS}, ${area} span[data-mention]`, {
  display: "inline",
  padding: "1px 5px",
  borderRadius: themeVars.radius.sm,
  fontWeight: 700,
  color: accentActive,
  background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
  whiteSpace: "nowrap",
});
