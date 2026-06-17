import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const CAT_COLORS = {
  contract: themeVars.color.accentPrimary,
  advice: themeVars.color.accentInfo,
  litigation: themeVars.color.accentDanger,
  legalProject: themeVars.color.accentSuccess,
} as const;

export const wrap = style({ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 });

export const panel = style({
  display: "grid",
  gridTemplateColumns: "184px 1fr",
  height: 360,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 10,
  overflow: "hidden",
});

/* 좌측 카테고리 필터 */
export const cats = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  borderRight: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurfaceAlt,
  padding: "12px 10px",
  overflowY: "auto",
});
export const catsHead = style({
  margin: "0 4px 6px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: themeVars.color.textMuted,
});
export const cat = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 8px",
  borderRadius: 7,
  cursor: "pointer",
  selectors: { "&:hover": { background: themeVars.color.neutralSurface } },
});
export const catName = style({ flex: 1, fontSize: 13, fontWeight: 600, color: themeVars.color.textHeading });
export const catCount = style({ fontSize: 11, fontWeight: 700, color: themeVars.color.textMuted });
export const dot = styleVariants(CAT_COLORS, (color) => ({
  width: 8,
  height: 8,
  borderRadius: 999,
  flexShrink: 0,
  background: color,
}));

/* 우측 문서 목록 */
export const docs = style({ display: "flex", flexDirection: "column", gap: 2, padding: 8, overflowY: "auto" });
export const doc = style({
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "10px 12px",
  borderRadius: 8,
  cursor: "pointer",
  selectors: { "&:hover": { background: themeVars.color.neutralSurfaceAlt } },
});
export const docOn = style({
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 7%, ${themeVars.color.neutralSurface})`,
  selectors: { "&:hover": { background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 9%, ${themeVars.color.neutralSurface})` } },
});
export const docIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: 8,
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 10%, ${themeVars.color.neutralSurface})`,
  color: themeVars.color.accentPrimary,
});
export const docMain = style({ flex: 1, minWidth: 0 });
export const docName = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 700,
  color: themeVars.color.textHeading,
});
export const docSub = style({
  marginTop: 3,
  fontSize: 11.5,
  color: themeVars.color.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
export const docWhen = style({ fontSize: 11.5, color: themeVars.color.textMuted, flexShrink: 0 });

export const tag = styleVariants(CAT_COLORS, (color) => ({
  flexShrink: 0,
  padding: "1px 7px",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.6,
  color,
  background: `color-mix(in srgb, ${color} 12%, ${themeVars.color.neutralSurface})`,
}));

export const empty = style({ padding: "40px 16px", textAlign: "center", fontSize: 12.5, color: themeVars.color.textMuted });

/* 푸터 */
export const footRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 });
export const footInfo = style({ fontSize: 12.5, fontWeight: 700, color: themeVars.color.textPrimary });
export const footCount = style({ color: themeVars.color.accentPrimary });
export const footBtns = style({ display: "flex", gap: 8 });
