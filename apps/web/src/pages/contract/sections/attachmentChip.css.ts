import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/**
 * 첨부 칩 + 드롭존 + dnd 힌트 스타일 — 시안(comment-section-mockup.html) .ed-attachstrip/.filechip 매핑.
 * 토큰은 lawkit themeVars 만 사용(인라인 0, hex 0). 색은 color-mix 로 파생.
 */
const accent = themeVars.color.accentPrimary;
const accentActive = themeVars.color.accentPrimaryActive;
const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const heading = themeVars.color.textHeading;
const danger = themeVars.color.accentDanger;
const faint = themeVars.color.textDisabled;

/* 칩 strip — 컴팩트 에디터 안쪽(툴바와 콘텐츠 사이) */
export const strip = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  padding: "8px 13px 10px",
});

/* 드래그&드롭 highlight — wrap 자체에 data-dragover='true'일 때 강조 */
export const dropOverlay = style({
  borderColor: accent,
  background: `color-mix(in srgb, ${accent} 4%, ${surface})`,
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px 6px 9px",
  background: surfaceAlt,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.md,
  fontSize: 11.5,
  selectors: {
    "&[data-status='error']": {
      borderColor: `color-mix(in srgb, ${danger} 30%, ${border})`,
      background: `color-mix(in srgb, ${danger} 6%, ${surface})`,
    },
    "&[data-status='uploading']": {
      borderStyle: "dashed",
    },
  },
});

export const chipIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: themeVars.radius.sm,
  background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
  color: accentActive,
  flexShrink: 0,
});

export const chipName = style({
  fontWeight: 700,
  color: heading,
  maxWidth: 200,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const chipSize = style({
  color: faint,
  fontVariantNumeric: "tabular-nums",
});

export const chipStatus = style({
  color: faint,
  fontSize: 10.5,
  fontWeight: 600,
});

export const chipError = style({
  color: danger,
  fontSize: 10.5,
  fontWeight: 700,
});

export const chipRemove = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: 99,
  color: faint,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  padding: 0,
  transition: "background .12s, color .12s",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${danger} 12%, ${surface})`,
      color: danger,
    },
  },
});

export const dndHint = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: faint,
  fontWeight: 600,
});

export const dndIcon = style({ width: 13, height: 13 });

/* 다운로드 칩(읽기 모드 — CommentItem 안) — 시안 .attach */
export const downloadList = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
});

export const downloadLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.md,
  fontSize: 12,
  color: heading,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: accent, color: accentActive },
  },
});

globalStyle(`${downloadLink} svg`, {
  width: 14,
  height: 14,
  color: accent,
});
