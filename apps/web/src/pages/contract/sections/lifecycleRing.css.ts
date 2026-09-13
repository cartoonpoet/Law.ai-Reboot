import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 계약 상세 진행 게이지(링) — themeVars + color-mix 파생만(로컬 hex 0).
 * 게이지 채움은 진행률(0~100)별 styleVariants 로 만들어 인라인 스타일 없이 전환한다.
 * ======================================================================= */

const c = themeVars.color;
const PRIMARY = c.accentPrimary;
const PRIMARY_DONE = `color-mix(in srgb, ${c.accentPrimary} 50%, ${c.neutralSurface})`;
const HEADING = c.textHeading;
const MUTED = c.textMuted;
const FAINT = c.neutralBorderStrong;
const RAISED = c.neutralSurfaceRaised;

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const NO_MOTION = { "(prefers-reduced-motion: reduce)": { animation: "none", transition: "none" } };

export const RING_SIZE = 104;
export const RING_RADIUS = 43;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const drawRing = keyframes({ from: { strokeDashoffset: RING_LENGTH } });
const rise = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } });

const focusable = style({
  outline: "none",
  selectors: { "&:focus-visible": { boxShadow: themeVars.shadow.focus } },
});

/* 카드 — contractDetail.card 와 같은 모양이지만 팝오버가 잘리지 않도록 overflow 를 열어 둔다 */
export const card = style({
  position: "relative",
  zIndex: 2,
  padding: 18,
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 8,
  boxShadow: themeVars.shadow.raised,
});

export const root = style({ display: "flex", alignItems: "center", gap: 24, padding: "2px 4px" });

/* lawkit Popover·Tooltip wrapper 는 기본 inline 이라 트리거 크기에 맞춘다 */
export const trigger = style({ display: "inline-flex" });

export const ring = style([
  focusable,
  { position: "relative", flexShrink: 0, width: RING_SIZE, height: RING_SIZE, borderRadius: 999, cursor: "pointer" },
]);

export const ringSvg = style({ display: "block", transform: "rotate(-90deg)" });
export const ringTrack = style({ fill: "none", stroke: RAISED, strokeWidth: 9 });

export const ringFill = style({
  fill: "none",
  stroke: PRIMARY,
  strokeWidth: 9,
  strokeLinecap: "round",
  strokeDasharray: RING_LENGTH,
  transition: `stroke-dashoffset 1s ${EASE}, stroke-width .2s`,
  animation: `${drawRing} 1.2s ${EASE}`,
  "@media": NO_MOTION,
  selectors: { [`${ring}:hover &, ${ring}:focus-visible &`]: { strokeWidth: 11 } },
});

export const ringOffset = styleVariants(
  Object.fromEntries(
    Array.from({ length: 101 }, (_, pct) => [String(pct), { strokeDashoffset: RING_LENGTH * (1 - pct / 100) }]),
  ),
);

export const ringCenter = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
});

export const ringPercent = style({ fontSize: 22, fontWeight: 800, color: HEADING, fontVariantNumeric: "tabular-nums" });
export const ringCount = style({ fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" });

export const info = style({ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 });

export const eyebrow = style({ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11, fontWeight: 800, color: FAINT });
export const hint = style({ fontSize: 11, fontWeight: 500, color: FAINT });

export const title = style({
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: HEADING,
  animation: `${rise} .5s ${EASE}`,
  "@media": NO_MOTION,
});

export const note = style({ margin: 0, fontSize: 12.5, color: MUTED });

export const dots = style({ display: "flex", gap: 5, marginTop: 4 });

const dot = style([
  focusable,
  {
    display: "block",
    width: 22,
    height: 5,
    margin: "8px 0",
    borderRadius: 3,
    background: RAISED,
    transition: `background .3s, width .4s ${EASE}, transform .15s`,
    selectors: { "&:hover": { transform: "scaleY(2)" } },
  },
]);

export const dotState = styleVariants({
  done: [dot, { background: PRIMARY_DONE }],
  current: [dot, { width: 42, background: PRIMARY }],
  todo: [dot],
});

export const popoverBody = style({ maxHeight: 440, overflowY: "auto", paddingTop: 4 });
