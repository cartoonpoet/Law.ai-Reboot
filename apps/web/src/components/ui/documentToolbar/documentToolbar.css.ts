import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const accent = themeVars.color.accentPrimary;
const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const muted = themeVars.color.textMuted;

/* 리본 — 워드처럼 두 줄. 위는 글자 서식, 아래는 문단·삽입 도구. */
export const ribbon = style({
  borderBottom: `1px solid ${border}`,
  background: `color-mix(in srgb, ${surfaceAlt} 55%, ${surface})`,
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: 3,
  flexWrap: "wrap",
  padding: "5px 9px",
});

/* 둘째 줄 — 첫 줄과 옅은 선으로 나눈다. */
export const rowSecond = style({
  borderTop: `1px solid color-mix(in srgb, ${border} 60%, transparent)`,
});

/* 드롭다운 폭 — 툴바가 넘치지 않게 좁게 고정한다. */
export const fontSelect = style({ width: 128 });
export const sizeSelect = style({ width: 72 });
export const blockSelect = style({ width: 92 });
export const lineSelect = style({ width: 80 });

/* LDS Dropdown 트리거를 툴바 버튼(30px)과 같은 키로 맞춘다. */
globalStyle(
  `${fontSelect} button, ${sizeSelect} button, ${blockSelect} button, ${lineSelect} button`,
  { height: 30 },
);

/* 드롭다운 앞에 붙는 설명 아이콘 — 누를 수 없는 표시용. */
export const leadIcon = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "0 2px",
  color: muted,
});

/* 위·아래 첨자 글리프 — x² / x₂. */
export const scriptGlyph = style({
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1,
  color: themeVars.color.textHeading,
});

export const scriptMark = style({
  fontSize: 9,
  fontWeight: 800,
  selectors: {
    "sup&": { verticalAlign: "super" },
    "sub&": { verticalAlign: "sub" },
  },
});

/* 찾기·바꾸기 팝오버 */
export const findWrap = style({ position: "relative" });

export const findPanel = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  zIndex: 30,
  width: 268,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.md,
  boxShadow: themeVars.shadow.modal,
});

export const findHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const findTitle = style({
  fontSize: 12.5,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});

export const findField = style({ display: "flex", flexDirection: "column", gap: 4 });

export const findLabel = style({ fontSize: 11, fontWeight: 700, color: muted });

export const findCount = style({
  fontSize: 11,
  fontWeight: 700,
  color: accent,
});

export const findActions = style({ display: "flex", alignItems: "center", gap: 6 });

globalStyle(`${findActions} > *`, { flex: 1 });
