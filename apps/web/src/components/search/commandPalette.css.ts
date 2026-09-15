import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { AI_BORDER, AI_GRADIENT, AI_TEXT, AI_TINT } from "../ui/aiTone";

const c = themeVars.color;

/* 통합검색창(Ctrl+K) — 화면 가운데 위쪽에 뜨는 검색 대화상자 */
export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: "12vh",
});

export const backdrop = style({
  position: "absolute",
  inset: 0,
  border: "none",
  padding: 0,
  background: `color-mix(in srgb, ${c.textHeading} 40%, transparent)`,
  cursor: "default",
});

export const dialog = style({
  position: "relative",
  width: "min(620px, calc(100vw - 32px))",
  maxHeight: "70vh",
  display: "flex",
  flexDirection: "column",
  background: c.neutralSurface,
  borderRadius: 14,
  boxShadow: themeVars.shadow.modal,
  overflow: "hidden",
});

export const inputRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 18px",
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const inputIcon = style({ width: 18, height: 18, color: c.textMuted, flexShrink: 0 });

export const input = style({
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  font: "inherit",
  fontSize: 16,
  color: c.textHeading,
  "::placeholder": { color: c.neutralBorderStrong },
});

export const kbd = style({
  fontFamily: "inherit",
  fontSize: 10.5,
  fontWeight: 600,
  padding: "1px 6px",
  borderRadius: 4,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurfaceAlt,
  color: c.textMuted,
  flexShrink: 0,
});

export const body = style({ flex: 1, overflowY: "auto", padding: "6px 8px 8px" });

export const group = style({ padding: "4px 0" });

export const groupLabel = style({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: c.textMuted,
  padding: "8px 10px 4px",
});

export const groupEmpty = style({ margin: 0, padding: "8px 10px", fontSize: 12.5, color: c.textMuted });

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "9px 10px",
  border: "1px solid transparent",
  borderRadius: 8,
  background: "transparent",
  font: "inherit",
  color: c.textHeading,
  textAlign: "left",
  cursor: "pointer",
});

export const optionSelected = style({ background: c.neutralSurfaceAlt });

export const optionIcon = style({
  width: 28,
  height: 28,
  borderRadius: 7,
  background: c.neutralSurfaceAlt,
  color: c.textMuted,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  selectors: { [`${optionSelected} &`]: { background: c.neutralSurface, color: c.accentPrimary } },
});

export const optionGlyph = style({ width: 15, height: 15 });

export const optionMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 });

export const optionTitle = style({
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const optionMeta = style({
  fontSize: 12,
  color: c.textMuted,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const optionCode = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 });

/* AI 비서에게 물어보기 — AI 보라 톤으로 검색 결과와 구분 */
export const aiArea = style({ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${c.neutralBorder}` });

export const aiOption = style({
  background: AI_TINT,
  borderColor: AI_BORDER,
  selectors: { [`&${optionSelected}`]: { background: AI_TINT, boxShadow: `0 0 0 2px ${AI_BORDER}` } },
});

export const aiIcon = style({
  width: 28,
  height: 28,
  borderRadius: 7,
  background: AI_GRADIENT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const aiGlyph = style({ width: 14, height: 14, color: c.textInverse });

export const aiTitle = style({ fontSize: 13.5, fontWeight: 700, color: AI_TEXT });

export const footer = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  padding: "10px 18px",
  background: c.neutralSurfaceAlt,
  borderTop: `1px solid ${c.neutralBorder}`,
  fontSize: 11.5,
  color: c.textMuted,
});

export const hint = style({ display: "inline-flex", alignItems: "center", gap: 5 });
