import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const accent = themeVars.color.accentPrimary;
const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;
const warning = themeVars.color.accentWarning;
const danger = themeVars.color.accentDanger;

/* 에디터 박스 — 시안 .editor: border·radius·raised shadow·focus-within ring. */
export const wrap = style({
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.lg,
  background: surface,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
  transition: "border-color .12s, box-shadow .12s",
  selectors: {
    "&:focus-within": {
      borderColor: accent,
      boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)`,
    },
  },
});

/* 풀 툴바 — 그룹·구분선·flex-wrap. */
export const toolbar = style({
  display: "flex",
  alignItems: "center",
  gap: 3,
  flexWrap: "wrap",
  padding: "7px 9px",
  borderBottom: `1px solid ${border}`,
  background: `color-mix(in srgb, ${surfaceAlt} 55%, ${surface})`,
});

export const group = style({ display: "inline-flex", alignItems: "center", gap: 2 });

export const sep = style({
  width: 1,
  alignSelf: "stretch",
  margin: "5px",
  background: border,
});

/* 아이콘 버튼 — hover/active(on)·툴팁(data-tip). */
export const tbtn = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  height: 30,
  minWidth: 30,
  padding: "0 6px",
  borderRadius: themeVars.radius.md,
  color: muted,
  background: "transparent",
  border: "1px solid transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  transition: "background .12s, color .12s, border-color .12s",
  selectors: {
    "&:hover": {
      background: surface,
      color: themeVars.color.accentPrimaryActive,
      borderColor: border,
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)`,
    },
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
      color: themeVars.color.accentPrimaryActive,
      borderColor: `color-mix(in srgb, ${accent} 22%, ${surface})`,
    },
    /* 툴팁 — 시안 navy bg. accentDark 토큰 사용(임의 hex 금지). */
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

/* B/I/U/S 글리프 */
export const glyph = style({
  fontWeight: 800,
  fontSize: 13,
  selectors: {
    "i&": { fontStyle: "italic", fontWeight: 600 },
    "u&": { textDecoration: "underline" },
    "s&": { textDecoration: "line-through" },
  },
});

/* 글자색·하이라이트 아이콘 + 스와치 컨테이너 */
export const colorGlyph = style({
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  fontWeight: 800,
  fontSize: 13,
  color: heading,
});

export const swatchColor = style({ display: "block", width: 14, height: 3, borderRadius: 2, marginTop: 1, background: danger });
export const swatchHighlight = style({ display: "block", width: 14, height: 3, borderRadius: 2, marginTop: 1, background: warning });

/* 아이콘 SVG 크기(EditorIcons에서 className으로 사용 — 인라인 style 금지) */
export const icon = style({ width: 15, height: 15, flexShrink: 0 });
export const iconFill = style({ fill: "currentColor", stroke: "none" });
export const caret = style({ width: 9, height: 9, opacity: 0.7, flexShrink: 0 });

/* 문단 스타일 셀렉트형 버튼 + 드롭다운 */
export const selectWrap = style({ position: "relative" });
export const selectBtn = style({ minWidth: 64, justifyContent: "space-between" });
export const selectLabel = style({ fontSize: 12, fontWeight: 700, color: themeVars.color.textSecondary, marginRight: 2 });

export const menu = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 120,
  padding: 5,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.md,
  boxShadow: themeVars.shadow.modal,
});

export const menuItem = style({
  display: "block",
  width: "100%",
  padding: "7px 9px",
  borderRadius: themeVars.radius.sm,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "left",
  color: themeVars.color.textHeading,
  selectors: {
    "&:hover": { background: `color-mix(in srgb, ${accent} 10%, ${surface})` },
    "&[data-active='true']": { background: `color-mix(in srgb, ${accent} 12%, ${surface})`, color: accent },
  },
});

/* contenteditable 콘텐츠 영역 */
export const area = style({
  padding: "14px 15px",
  fontSize: 13.5,
  lineHeight: 1.7,
  color: themeVars.color.textPrimary,
  minHeight: 120,
  outline: "none",
});

/* 하단 바 — 붙여넣기 안내. */
export const editorBar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 15px",
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

/* placeholder — extension-placeholder가 빈 첫 문단에 is-editor-empty + data-placeholder 부여(MentionEditor 선례). */
globalStyle(`${area} p.is-editor-empty:first-child::before`, {
  content: "attr(data-placeholder)",
  color: muted,
  float: "left",
  height: 0,
  pointerEvents: "none",
});

/* contenteditable 내부 노드 서식 — 시안 .ed-content * 룰을 토큰으로 매핑(globalStyle, 인라인 0). */
globalStyle(`${area} p`, { margin: "0 0 10px" });
globalStyle(`${area} > p:last-child`, { marginBottom: 0 });
globalStyle(`${area} strong`, { fontWeight: 700, color: heading });
globalStyle(`${area} em`, { fontStyle: "italic" });
globalStyle(`${area} h1`, { margin: "16px 0 8px", fontSize: 19, fontWeight: 700, color: heading, letterSpacing: "-.02em" });
globalStyle(`${area} h2`, { margin: "14px 0 6px", fontSize: 16, fontWeight: 700, color: heading, letterSpacing: "-.01em" });
globalStyle(`${area} h3`, { margin: "14px 0 6px", fontSize: 15, fontWeight: 700, color: heading, letterSpacing: "-.01em" });
globalStyle(`${area} h1:first-child, ${area} h2:first-child, ${area} h3:first-child`, { marginTop: 0 });
globalStyle(`${area} ul, ${area} ol`, { margin: "6px 0 10px", paddingLeft: 22 });
globalStyle(`${area} li`, { margin: "3px 0" });
globalStyle(`${area} a`, { color: accent, textDecoration: "underline" });
globalStyle(`${area} mark`, {
  background: `color-mix(in srgb, ${warning} 30%, ${surface})`,
  color: themeVars.color.accentWarningActive,
  borderRadius: 2,
  padding: "0 2px",
});
globalStyle(`${area} blockquote`, {
  margin: "10px 0",
  paddingLeft: 12,
  borderLeft: `3px solid ${border}`,
  color: themeVars.color.textSecondary,
});
globalStyle(`${area} hr`, { border: "none", borderTop: `1px solid ${border}`, margin: "12px 0" });
