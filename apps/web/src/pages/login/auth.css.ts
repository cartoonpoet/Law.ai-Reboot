import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const FONT = themeVars.font.family;

/* 좌측 고정 + 우측 폼만 스왑 */
export const page = style({ minHeight: "100vh", display: "flex", background: themeVars.color.neutralSurface });
export const brandCol = style({ display: "flex", flex: "0 0 44%", maxWidth: 540 });
export const rightCol = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 24px",
  background: themeVars.color.neutralBackground,
});

/* 우측 카드 래퍼 (회원가입만 넓게) */
export const rise = styleVariants({
  normal: { width: "100%", maxWidth: 396 },
  wide: { width: "100%", maxWidth: 440 },
});

export const card = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(16,24,40,.1)",
  padding: "28px 28px 26px",
});
export const logoRow = style({ display: "flex", alignItems: "center", gap: 7, marginBottom: 22 });
export const brand = style({ fontSize: 15, fontWeight: 700, color: themeVars.color.textHeading });
export const brandDot = style({ color: themeVars.color.accentPrimary });

export const title = style({ margin: "0 0 6px", fontSize: 21, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: "-0.025em", lineHeight: 1.3 });
export const titleAfterBack = style({ margin: "12px 0 0", fontSize: 21, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: "-0.025em" });
export const subtitle = style({ margin: "7px 0 20px", fontSize: 13, color: themeVars.color.textMuted });

export const tabsWrap = style({ marginBottom: 18 });

export const footer = style({ marginTop: 14, textAlign: "center", fontSize: 12, color: themeVars.color.textMuted });
export const footerStrong = style({ color: themeVars.color.textSecondary, fontWeight: 700 });

export const belowRow = style({ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, color: themeVars.color.textMuted });
export const linkBtn = style({ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: themeVars.color.accentPrimary, fontFamily: FONT, padding: 0 });
export const backBtn = style({ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: themeVars.color.textMuted, fontFamily: FONT, padding: 0, display: "inline-flex", alignItems: "center", gap: 3 });

/* reset 페이지 무효 토큰 안내 */
export const fallbackCol = style({ display: "flex", flexDirection: "column", gap: 16 });
export const fallbackText = style({ margin: 0, fontSize: 13, color: themeVars.color.textMuted, lineHeight: 1.6 });
export const fallbackBtn = style({ display: "grid" });
