import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * Badge / Tag 공용 톤 — themeVars + color-mix 파생만(로컬 hex 0).
 * base = 점(dot) 색, strong = 글자색, tint = 배경.
 * lawkit Badge 는 tone 이 primary|neutral 뿐이라 상태 6색을 여기서 파생한다.
 * ======================================================================= */

const c = themeVars.color;

const createTint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, ${c.neutralSurface})`;

const TONES = {
  primary: { base: c.accentPrimary, strong: c.accentPrimaryActive, tint: createTint(c.accentPrimary, 8) },
  success: { base: c.accentSuccess, strong: c.accentSuccessActive, tint: createTint(c.accentSuccess, 10) },
  danger: { base: c.accentDanger, strong: c.accentDangerActive, tint: createTint(c.accentDanger, 8) },
  warning: { base: c.accentWarning, strong: c.accentWarningActive, tint: createTint(c.accentWarning, 12) },
  info: { base: c.accentInfo, strong: c.accentInfoActive, tint: createTint(c.accentInfo, 8) },
  secondary: { base: c.textMuted, strong: c.accentDark, tint: createTint(c.textMuted, 8) },
  neutral: { base: c.textMuted, strong: c.textMuted, tint: c.neutralSurfaceRaised },
} as const;

export type ToneTypes = keyof typeof TONES;

const toneBase = style({
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 600,
  whiteSpace: "nowrap",
  fontFamily: themeVars.font.family,
});

export const tone = styleVariants(TONES, (t) => [toneBase, { background: t.tint, color: t.strong }]);

/* --- Badge --- */
export const badgeSize = styleVariants({
  sm: { gap: 5, padding: "2px 8px", fontSize: 11.5, borderRadius: 5 },
  md: { gap: 5, padding: "3px 10px", fontSize: 12, borderRadius: 5 },
});

const dotBase = style({ width: 5, height: 5, borderRadius: 1.5, flexShrink: 0 });

export const badgeDot = styleVariants(TONES, (t) => [dotBase, { background: t.base }]);

/* --- Tag --- */
export const tag = style({ padding: "1px 7px", fontSize: 11.5, borderRadius: 4 });
