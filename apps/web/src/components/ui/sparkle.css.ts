import { keyframes, style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * AI 반짝임("뾰로롱") — AI 가 말하거나 결과를 내놓는 순간에만 짧게 튄다.
 * 아이콘이 한 번 톡 튀고, 둘레에서 작은 별 두 개가 퍼졌다 사라진다.
 * 움직임 줄이기를 켠 사용자에게는 아무것도 움직이지 않는다.
 * ======================================================================= */

const c = themeVars.color;

const pop = keyframes({
  "0%": { transform: "scale(0.82) rotate(-12deg)" },
  "45%": { transform: "scale(1.14) rotate(8deg)" },
  "70%": { transform: "scale(0.97) rotate(-3deg)" },
  "100%": { transform: "scale(1) rotate(0deg)" },
});

// 작은 별 하나가 비스듬히 튀어나갔다 사라진다.
const twinkle = keyframes({
  "0%": { opacity: 0, transform: "translate(0, 0) scale(0.2)" },
  "35%": { opacity: 1, transform: "translate(var(--sparkle-x), var(--sparkle-y)) scale(1)" },
  "100%": { opacity: 0, transform: "translate(calc(var(--sparkle-x) * 1.6), calc(var(--sparkle-y) * 1.6)) scale(0.3)" },
});

const star = {
  content: '""',
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: c.accentPrimary,
  boxShadow: `0 0 6px ${c.accentPrimary}`,
  opacity: 0,
  pointerEvents: "none",
} as const;

/** 감쌀 대상(아바타·아이콘)에 붙이면 한 번 반짝인다. 다시 반짝이려면 key 를 바꿔 새로 그린다. */
export const sparkle = style({
  position: "relative",
  animation: `${pop} .55s cubic-bezier(0.2, 0.9, 0.2, 1)`,
  selectors: {
    "&::before": {
      ...star,
      vars: { "--sparkle-x": "-12px", "--sparkle-y": "-12px" },
      animation: `${twinkle} .7s ease-out`,
    },
    "&::after": {
      ...star,
      vars: { "--sparkle-x": "11px", "--sparkle-y": "-9px" },
      width: 4,
      height: 4,
      animation: `${twinkle} .7s ease-out .08s`,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      selectors: { "&::before, &::after": { animation: "none", opacity: 0 } },
    },
  },
});
