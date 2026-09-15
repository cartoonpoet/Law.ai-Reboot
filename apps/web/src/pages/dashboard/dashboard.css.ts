import { createVar, keyframes, style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { AI_BORDER, AI_GRADIENT, AI_TEXT, AI_TINT } from "../../components/ui/aiTone";

/* 홈 대시보드 — AI 브리핑, 계약 검토 파이프라인, 내 할일, 기한 임박. */

const c = themeVars.color;
const NARROW = "screen and (max-width: 1100px)";
const FAINT = c.neutralBorderStrong;
const REDUCED = "(prefers-reduced-motion: reduce)";

/* --- 대시보드 골격 --- */
export const dash = style({ display: "flex", flexDirection: "column", gap: 16 });

export const header = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  paddingBottom: 12,
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const eyebrow = style({ fontSize: 11, fontWeight: 700, color: FAINT, letterSpacing: "0.07em", textTransform: "uppercase" });
export const h1 = style({ margin: "7px 0 0", fontSize: 22, fontWeight: 800, color: c.textHeading, letterSpacing: "-0.025em" });
export const headerMeta = style({ textAlign: "right", paddingBottom: 2 });
export const headerDate = style({ fontSize: 12.5, fontWeight: 600, color: c.textSecondary });

export const bodyGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 312px",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const card = style({
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: 8,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
});

export const cardHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "11px 16px",
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const cardTitle = style({ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: c.textHeading });
export const cardTitleIcon = style({ width: 14, height: 14, color: c.textMuted });
export const cardMeta = style({ fontSize: 11.5, color: FAINT });
export const countPill = style({ fontSize: 11.5, fontWeight: 700, color: c.textMuted });

export const emptyState = style({ padding: "28px 16px", textAlign: "center", fontSize: 13, color: c.textMuted });

/* --- AI 브리핑 --- */
// 옆 작대기 없이: 카드 전체를 옅은 AI 색으로 구분하고, 급한 정도는 항목 앞 알약으로 표시한다.
const briefShimmer = keyframes({ from: { backgroundPosition: "-200px 0" }, to: { backgroundPosition: "200px 0" } });

export const brief = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "16px 18px 18px",
  borderRadius: 12,
  border: `1px solid ${AI_BORDER}`,
  background: `linear-gradient(135deg, ${AI_TINT} 0%, ${c.neutralSurface} 65%)`,
  boxShadow: themeVars.shadow.raised,
});

export const briefTop = style({ display: "flex", alignItems: "center", gap: 10 });

export const briefAvatar = style({
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: AI_GRADIENT,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const briefAvatarIcon = style({ width: 15, height: 15, color: c.textInverse });
export const briefTitleGroup = style({ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 });
export const briefTitle = style({ fontSize: 13, fontWeight: 800, color: AI_TEXT, letterSpacing: "-0.01em" });
export const briefMeta = style({ fontSize: 11.5, color: FAINT });

export const briefRefresh = style({
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 999,
  border: `1px solid ${AI_BORDER}`,
  background: c.neutralSurface,
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  color: AI_TEXT,
  cursor: "pointer",
  selectors: { "&:hover": { background: AI_TINT }, "&:disabled": { cursor: "default", opacity: 0.6 } },
});

export const briefRefreshIcon = style({ width: 12, height: 12 });

export const briefHeadline = style({
  fontSize: 16,
  fontWeight: 800,
  color: c.textHeading,
  letterSpacing: "-0.02em",
  lineHeight: 1.45,
  textWrap: "balance",
});

export const briefMuted = style({ fontSize: 12.5, color: c.textMuted });

export const briefLink = style({
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  color: AI_TEXT,
  fontWeight: 600,
  textDecoration: "underline",
  cursor: "pointer",
});

// 정리 중 — 반짝이는 자리표시
export const briefSkeleton = style({ display: "flex", flexDirection: "column", gap: 8 });

const skeletonBase = style({
  height: 12,
  borderRadius: 6,
  background: `linear-gradient(90deg, ${c.neutralSurfaceAlt} 0%, ${c.neutralSurface} 50%, ${c.neutralSurfaceAlt} 100%)`,
  backgroundSize: "400px 100%",
  animation: `${briefShimmer} 1.2s linear infinite`,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const briefSkeletonLine = styleVariants({
  wide: [skeletonBase, { width: "70%", height: 16 }],
  full: [skeletonBase, { width: "100%" }],
  half: [skeletonBase, { width: "55%" }],
});

export const briefList = style({
  display: "flex",
  flexDirection: "column",
  borderRadius: 10,
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  overflow: "hidden",
});

export const briefRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 14px",
  borderTop: `1px solid ${c.neutralBorder}`,
  selectors: { "&:first-child": { borderTop: "none" } },
});

const tonePillBase = style({
  flexShrink: 0,
  minWidth: 46,
  textAlign: "center",
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
});

export const briefTone = styleVariants({
  danger: [tonePillBase, { background: `color-mix(in srgb, ${c.accentDanger} 12%, ${c.neutralSurface})`, color: c.accentDangerActive }],
  warning: [tonePillBase, { background: `color-mix(in srgb, ${c.accentWarning} 16%, ${c.neutralSurface})`, color: c.accentWarningActive }],
  info: [tonePillBase, { background: AI_TINT, color: AI_TEXT }],
});

export const briefText = style({ flex: 1, minWidth: 0, fontSize: 13, color: c.textHeading, lineHeight: 1.55 });
export const briefDone = style({ fontSize: 12, fontWeight: 700, color: c.accentSuccessActive, flexShrink: 0 });
export const briefConfirm = style({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: c.textSecondary, flexShrink: 0 });

/* --- 파이프라인 (움직임) --- */
const stageDelay = createVar();

const barGrow = keyframes({ from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } });
const riseIn = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } });
const flowDots = keyframes({ from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "24px 0" } });
const nudge = keyframes({ "0%, 70%, 100%": { transform: "translateX(0)", opacity: 0.5 }, "85%": { transform: "translateX(3px)", opacity: 1 } });
const tagPulse = keyframes({ "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.08)" } });
const busiestGlow = keyframes({
  "0%, 100%": { boxShadow: `inset 0 -2px 0 ${c.accentDanger}` },
  "50%": { boxShadow: `inset 0 -2px 0 ${c.accentDanger}, inset 0 0 0 999px color-mix(in srgb, ${c.accentDanger} 6%, transparent)` },
});

export const stageRow = style({ display: "flex", position: "relative" });

// 단계 사이로 흘러가는 점선 — 일이 왼쪽에서 오른쪽으로 흐른다는 느낌
export const flowTrack = style({
  position: "absolute",
  left: 14,
  right: 14,
  bottom: 6,
  height: 2,
  backgroundImage: `radial-gradient(circle, ${c.neutralBorderStrong} 1px, transparent 1.5px)`,
  backgroundSize: "12px 2px",
  opacity: 0.7,
  animation: `${flowDots} 1.2s linear infinite`,
  pointerEvents: "none",
  "@media": { [REDUCED]: { animation: "none" } },
});

export const stageWrap = style({ display: "flex", alignItems: "center", flex: 1 });

export const stageDelayVariants = styleVariants(
  Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), { vars: { [stageDelay]: `${i * 90}ms` } }])),
);

export const stage = style({
  flex: 1,
  padding: "13px 14px 12px",
  position: "relative",
  borderRadius: 6,
  transition: "transform .15s ease, background .15s ease",
  selectors: { "&:hover": { transform: "translateY(-2px)", background: c.neutralSurfaceAlt } },
});

export const stageBusiest = style({
  background: `color-mix(in srgb, ${c.accentDanger} 6%, ${c.neutralSurface})`,
  animation: `${busiestGlow} 2.4s ease-in-out infinite`,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const busiestTag = style({
  position: "absolute",
  top: 7,
  right: 8,
  fontSize: 9.5,
  fontWeight: 700,
  color: c.accentDanger,
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  padding: "1px 5px",
  borderRadius: 3,
  animation: `${tagPulse} 1.6s ease-in-out infinite`,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const stageLabel = style({ fontSize: 11, fontWeight: 600, color: FAINT, marginBottom: 8, whiteSpace: "nowrap" });
export const barBox = style({ display: "flex", alignItems: "flex-end", height: 28, marginBottom: 7 });

const barBase = style({
  width: "55%",
  borderRadius: 3,
  transformOrigin: "bottom",
  animation: `${barGrow} .6s cubic-bezier(.2,.8,.2,1) both`,
  animationDelay: stageDelay,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const barTone = styleVariants({
  danger: [barBase, { background: c.accentDanger }],
  success: [barBase, { background: c.accentSuccess }],
  neutral: [barBase, { background: FAINT }],
});

export const barFaint = style({ opacity: 0.35 });

// 막대 높이(3~26px) — 인라인 스타일 없이 값별 클래스로.
export const barHeight = styleVariants(
  Object.fromEntries(Array.from({ length: 27 }, (_, h) => [String(h), { height: Math.max(3, h) }])),
);

export const stageCount = style({
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: c.textHeading,
  fontVariantNumeric: "tabular-nums",
  animation: `${riseIn} .45s ease-out both`,
  animationDelay: `calc(${stageDelay} + 250ms)`,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const stageCountBusiest = style({ color: c.accentDanger });
export const stageUnit = style({ fontSize: 11, color: FAINT, marginTop: 1 });

export const chevron = style({
  width: 11,
  height: 11,
  color: FAINT,
  flexShrink: 0,
  animation: `${nudge} 2s ease-in-out infinite`,
  animationDelay: stageDelay,
  "@media": { [REDUCED]: { animation: "none" } },
});

/* --- 내 할일 --- */
export const filterBar = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const todoList = style({ display: "flex", flexDirection: "column", gap: 1, padding: "5px 4px" });

export const todoRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "background .1s",
  selectors: { "&:hover": { background: c.neutralSurfaceAlt } },
});

export const ddayCol = style({ width: 38, flexShrink: 0, textAlign: "center", fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums" });

export const ddayTone = styleVariants({
  danger: { color: c.accentDanger },
  warning: { color: c.accentWarningActive },
  muted: { color: c.textMuted },
  faint: { color: FAINT },
});

export const divider = style({ width: 1, height: 24, background: c.neutralBorder, flexShrink: 0 });
export const todoMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 });
export const todoMeta = style({ display: "flex", alignItems: "center", gap: 6 });
export const todoId = style({ fontSize: 11, color: FAINT, fontVariantNumeric: "tabular-nums" });

export const todoTitle = style({
  fontSize: 13.5,
  fontWeight: 600,
  color: c.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const todoSide = style({ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 });

/* --- 기한 임박 --- */
export const railBody = style({ padding: "0 14px" });

export const deadlineRow = style({
  display: "flex",
  gap: 11,
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${c.neutralBorder}`,
  background: "none",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:last-child": { borderBottom: "none" },
    "&:hover": { background: c.neutralSurfaceAlt },
  },
});

export const scheduleDate = style({ display: "flex", flexDirection: "column", width: 42, flexShrink: 0 });
export const scheduleDay = style({ fontSize: 11, color: FAINT, fontWeight: 600, fontVariantNumeric: "tabular-nums" });
export const scheduleDday = style({ fontSize: 12, fontWeight: 800, marginTop: 1, fontVariantNumeric: "tabular-nums" });

const scheduleBarBase = style({ width: 2, borderRadius: 1, flexShrink: 0 });

export const scheduleBar = styleVariants({
  danger: [scheduleBarBase, { background: c.accentDanger }],
  warning: [scheduleBarBase, { background: c.accentWarning }],
  muted: [scheduleBarBase, { background: c.neutralBorder }],
  faint: [scheduleBarBase, { background: c.neutralBorder }],
});

export const scheduleMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 });
export const scheduleTitle = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });
export const scheduleBody = style({ fontSize: 12, color: c.textMuted });
