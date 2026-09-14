import { createVar, keyframes, style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 대시보드 개선안 — 현재 대시보드(레거시 인라인 스타일)의 모양을 themeVars 로 옮기고 AI 보조 표식을 더했다.
 * ======================================================================= */

const c = themeVars.color;
const NARROW = "screen and (max-width: 1100px)";
const FAINT = c.neutralBorderStrong;

// AI 보조 표식 — themeVars 에 AI 전용 색이 없어 info(청록)에서 파생. "AI 가 붙인 것"만 이 톤.
const AI_TEXT = c.accentInfoActive;
const AI_TINT = `color-mix(in srgb, ${c.accentInfo} 10%, ${c.neutralSurface})`;
const AI_BORDER = `color-mix(in srgb, ${c.accentInfo} 35%, ${c.neutralSurface})`;

/* --- 시안 페이지 --- */
export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const controls = style({
  padding: "14px 16px",
  background: c.neutralSurface,
  border: `1px dashed ${c.neutralBorder}`,
  borderRadius: 8,
});

export const changeList = style({ margin: "4px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 });

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
export const headerSync = style({ fontSize: 11, color: FAINT, marginTop: 2 });

export const bodyGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 312px",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const rail = style({ display: "flex", flexDirection: "column", gap: 16 });

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

export const linkMore = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  background: "none",
  border: "none",
  cursor: "pointer",
  color: c.textMuted,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "inherit",
});

export const linkIcon = style({ width: 12, height: 12 });

/* --- AI 보조 공통 --- */
export const aiNote = style({
  display: "inline-flex",
  alignItems: "flex-start",
  alignSelf: "flex-start",
  gap: 5,
  padding: "2px 8px",
  borderRadius: 6,
  background: AI_TINT,
  color: AI_TEXT,
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: "100%",
});

export const aiIcon = style({ flexShrink: 0, marginTop: 2, width: 13, height: 13, color: AI_TEXT });

export const aiLabel = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10.5,
  fontWeight: 700,
  color: AI_TEXT,
  background: AI_TINT,
  border: `1px solid ${AI_BORDER}`,
  padding: "2px 7px",
  borderRadius: 4,
  letterSpacing: "0.04em",
});

/* --- AI 요약 --- */
export const brief = style([card, { padding: "14px 16px 16px" }]);
export const briefTop = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 });
export const briefHeadline = style({ fontSize: 14.5, fontWeight: 700, color: c.textHeading, letterSpacing: "-0.015em", marginBottom: 11 });
export const briefList = style({ display: "flex", flexDirection: "column", gap: 7 });

export const briefRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px",
  borderRadius: 6,
  background: c.neutralSurfaceAlt,
  border: `1px solid ${c.neutralBorder}`,
});

const briefBarBase = style({ width: 2.5, alignSelf: "stretch", borderRadius: 2, flexShrink: 0 });

export const briefBar = styleVariants({
  danger: [briefBarBase, { background: c.accentDanger }],
  primary: [briefBarBase, { background: c.accentPrimary }],
  warning: [briefBarBase, { background: c.accentWarning }],
});

export const briefText = style({ flex: 1, fontSize: 12.5, color: c.textSecondary, lineHeight: 1.5 });

/* --- 파이프라인 (움직임) --- */
// 탭을 바꾸면 stageRow 가 key 로 다시 그려져 아래 등장 애니메이션이 매번 재생된다.
const REDUCED = "(prefers-reduced-motion: reduce)";
const stageDelay = createVar();

const barGrow = keyframes({ from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } });
const riseIn = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } });
const flowDots = keyframes({ from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "24px 0" } });
const nudge = keyframes({ "0%, 70%, 100%": { transform: "translateX(0)", opacity: 0.5 }, "85%": { transform: "translateX(3px)", opacity: 1 } });
const tagPulse = keyframes({ "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.08)" } });
const bottleneckGlow = (color: string) =>
  keyframes({
    "0%, 100%": { boxShadow: `inset 0 -2px 0 ${color}` },
    "50%": { boxShadow: `inset 0 -2px 0 ${color}, inset 0 0 0 999px color-mix(in srgb, ${color} 6%, transparent)` },
  });

export const pipelineTabs = style({ padding: "8px 16px 0", borderBottom: `1px solid ${c.neutralBorder}` });

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

export const stageBottleneck = styleVariants({
  danger: {
    background: `color-mix(in srgb, ${c.accentDanger} 6%, ${c.neutralSurface})`,
    animation: `${bottleneckGlow(c.accentDanger)} 2.4s ease-in-out infinite`,
    "@media": { [REDUCED]: { animation: "none" } },
  },
  primary: {
    background: `color-mix(in srgb, ${c.accentPrimary} 6%, ${c.neutralSurface})`,
    animation: `${bottleneckGlow(c.accentPrimary)} 2.4s ease-in-out infinite`,
    "@media": { [REDUCED]: { animation: "none" } },
  },
  success: {},
  neutral: {},
});

export const bottleneckTag = style({
  position: "absolute",
  top: 7,
  right: 8,
  fontSize: 9.5,
  fontWeight: 700,
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
  primary: [barBase, { background: c.accentPrimary }],
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
  fontVariantNumeric: "tabular-nums",
  animation: `${riseIn} .45s ease-out both`,
  animationDelay: `calc(${stageDelay} + 250ms)`,
  "@media": { [REDUCED]: { animation: "none" } },
});

export const countTone = styleVariants({
  danger: { color: c.accentDanger },
  primary: { color: c.accentPrimary },
  success: { color: c.textHeading },
  neutral: { color: c.textHeading },
});

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

export const pipelineAi = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 16px",
  borderTop: `1px solid ${c.neutralBorder}`,
});

/* --- 할 일 패널 --- */
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
export const panelFoot = style({ display: "flex", justifyContent: "flex-end", padding: "8px 14px 10px", borderTop: `1px solid ${c.neutralBorder}` });
/* --- 오른쪽 레일 --- */
export const railBody = style({ padding: "0 14px" });

export const scheduleRow = style({
  display: "flex",
  gap: 11,
  padding: "10px 0",
  borderBottom: `1px solid ${c.neutralBorder}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const scheduleDate = style({ width: 42, flexShrink: 0 });
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

export const noticeRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 0",
  borderBottom: `1px solid ${c.neutralBorder}`,
  cursor: "pointer",
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const noticeTitle = style({ flex: 1, minWidth: 0, fontSize: 13, color: c.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
export const noticeNew = style({ fontSize: 9.5, fontWeight: 800, color: c.accentDanger, flexShrink: 0 });
export const noticeDate = style({ fontSize: 11.5, color: FAINT, flexShrink: 0, fontVariantNumeric: "tabular-nums" });

/* --- 항상 떠 있는 AI 비서 (채널톡 스타일) --- */
const panelIn = keyframes({ from: { opacity: 0, transform: "translateY(16px) scale(.96)" }, to: { opacity: 1, transform: "none" } });
const popIn = keyframes({ from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } });
const MOBILE = "screen and (max-width: 480px)";
const AI_GRADIENT = `linear-gradient(150deg, ${AI_TEXT}, color-mix(in srgb, ${AI_TEXT} 60%, ${c.accentPrimary}))`;

const resetButton = style({ border: "none", background: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" });

export const launcher = style({
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 960,
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "none",
  background: AI_GRADIENT,
  color: c.textInverse,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: themeVars.shadow.modal,
  cursor: "pointer",
  transition: "transform .15s ease",
  selectors: {
    "&:hover": { transform: "scale(1.06)" },
    "&:focus-visible": { outline: "none", boxShadow: `${themeVars.shadow.modal}, ${themeVars.shadow.focus}` },
  },
});

export const launcherIcon = style({ width: 26, height: 26, color: c.textInverse });

export const unreadBadge = style({
  position: "absolute",
  top: -2,
  right: -2,
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 10,
  background: c.accentDanger,
  color: c.textInverse,
  fontSize: 11,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `2px solid ${c.neutralSurface}`,
});

/* 런처 위 먼저 말 거는 말풍선 */
export const popup = style({
  position: "fixed",
  right: 24,
  bottom: 96,
  zIndex: 950,
  width: 300,
  background: c.neutralSurface,
  borderRadius: 16,
  boxShadow: themeVars.shadow.modal,
  animation: `${popIn} .3s ease-out both`,
});

export const popupBody = style([resetButton, { display: "flex", flexDirection: "column", gap: 6, width: "100%", padding: "14px 16px" }]);
export const popupHead = style({ display: "flex", alignItems: "center", gap: 8 });
export const popupName = style({ fontSize: 12.5, fontWeight: 700, color: c.textHeading });
export const popupTime = style({ fontSize: 11, color: FAINT });
export const popupText = style({ fontSize: 13.5, lineHeight: 1.5, color: c.textHeading, paddingRight: 12 });

export const popupClose = style([
  resetButton,
  { position: "absolute", top: -8, left: -8, width: 24, height: 24, borderRadius: "50%", background: c.neutralSurface, boxShadow: themeVars.shadow.raised, display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted },
]);

export const botAvatar = style({
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: AI_GRADIENT,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const botAvatarLarge = style([botAvatar, { width: 40, height: 40 }]);
export const botAvatarIcon = style({ width: 14, height: 14, color: c.textInverse });

/* 패널 */
export const panel = style({
  position: "fixed",
  right: 24,
  bottom: 96,
  zIndex: 955,
  width: 380,
  height: "min(640px, calc(100vh - 120px))",
  background: c.neutralSurfaceAlt,
  borderRadius: 20,
  boxShadow: themeVars.shadow.modal,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  transformOrigin: "bottom right",
  animation: `${panelIn} .22s ease-out both`,
  "@media": { [MOBILE]: { inset: 0, width: "auto", height: "auto", borderRadius: 0 } },
});

/* 홈 */
export const homeScroll = style({ flex: 1, overflowY: "auto" });
export const homeHero = style({ padding: "20px 20px 60px", background: AI_GRADIENT, color: c.textInverse });
export const heroTop = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });
export const heroBrand = style({ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" });
export const heroClose = style([resetButton, { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: c.textInverse }]);
export const heroTitle = style({ margin: "22px 0 0", fontSize: 22, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.02em" });

export const homeCards = style({ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px", marginTop: -40 });

export const homeCard = style({
  background: c.neutralSurface,
  borderRadius: 14,
  boxShadow: themeVars.shadow.raised,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const homeCardTitle = style({ fontSize: 14, fontWeight: 700, color: c.textHeading });
export const operatorRow = style({ display: "flex", alignItems: "center", gap: 10 });
export const operatorText = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });
export const operatorName = style({ fontSize: 13.5, fontWeight: 700, color: c.textHeading });
export const statusText = style({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: c.textMuted });
export const onlineDot = style({ width: 7, height: 7, borderRadius: "50%", background: c.accentSuccess, flexShrink: 0 });

export const startButton = style([
  resetButton,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    background: AI_TEXT,
    color: c.textInverse,
    fontSize: 14,
    fontWeight: 700,
    selectors: { "&:hover": { filter: "brightness(1.08)" } },
  },
]);

export const startIcon = style({ width: 14, height: 14, color: c.textInverse });

export const quickRow = style([
  resetButton,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 0",
    borderTop: `1px solid ${c.neutralBorder}`,
    fontSize: 13.5,
    color: c.textHeading,
    selectors: { "&:first-child": { borderTop: "none", paddingTop: 0 }, "&:hover": { color: AI_TEXT } },
  },
]);

export const quickIcon = style({ width: 12, height: 12, color: FAINT });
export const recentRow = style([resetButton, { display: "flex", alignItems: "center", gap: 10, width: "100%" }]);
export const recentMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 });
export const recentPreview = style({ fontSize: 12.5, color: c.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
export const recentTime = style({ fontSize: 11, color: FAINT, flexShrink: 0 });

export const bottomNav = style({ display: "grid", gridTemplateColumns: "1fr 1fr", background: c.neutralSurface, borderTop: `1px solid ${c.neutralBorder}` });
export const navButton = style([resetButton, { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0 10px", fontSize: 11, color: c.textMuted }]);
export const navActive = style({ color: AI_TEXT, fontWeight: 700 });

/* 대화 */
export const chatHeader = style({ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px", background: c.neutralSurface, borderBottom: `1px solid ${c.neutralBorder}` });
export const iconButton = style([resetButton, { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted, selectors: { "&:hover": { background: c.neutralSurfaceAlt } } }]);
export const headerMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 });

export const chatBody = style({ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column-reverse", padding: "12px 16px" });
export const chatInner = style({ display: "flex", flexDirection: "column", gap: 14 });
export const dateDivider = style({ alignSelf: "center", fontSize: 11, color: FAINT, padding: "2px 10px", borderRadius: 999, background: c.neutralSurface });

export const msgRow = style({ display: "flex", alignItems: "flex-start", gap: 8, animation: `${popIn} .25s ease-out both` });
export const msgMain = style({ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" });
export const msgMeta = style({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: FAINT });
export const msgName = style({ fontWeight: 700, color: c.textMuted });

export const bubbleBot = style({
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: "4px 16px 16px 16px",
  padding: "9px 12px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: c.textHeading,
  whiteSpace: "pre-wrap",
});

export const userRow = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, animation: `${popIn} .2s ease-out both` });

export const bubbleUser = style({
  maxWidth: "80%",
  background: c.accentPrimary,
  color: c.textInverse,
  borderRadius: "16px 4px 16px 16px",
  padding: "9px 12px",
  fontSize: 13.5,
  lineHeight: 1.55,
});

export const quickReplies = style({ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 36 });

export const quickReply = style([
  resetButton,
  {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${AI_BORDER}`,
    background: c.neutralSurface,
    color: AI_TEXT,
    fontSize: 12.5,
    fontWeight: 600,
    selectors: { "&:hover": { background: AI_TINT } },
  },
]);

export const composer = style({ padding: "10px 12px 10px", background: c.neutralSurface, borderTop: `1px solid ${c.neutralBorder}` });

export const composerBox = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 4px 4px 14px",
  borderRadius: 22,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurfaceAlt,
  selectors: { "&:focus-within": { borderColor: AI_TEXT, background: c.neutralSurface } },
});

export const composerInput = style({
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  font: "inherit",
  fontSize: 13.5,
  color: c.textHeading,
  height: 32,
});

export const sendButton = style([resetButton, { width: 32, height: 32, borderRadius: "50%", background: AI_TEXT, display: "flex", alignItems: "center", justifyContent: "center" }]);
export const sendIcon = style({ width: 14, height: 14, color: c.textInverse });
export const composerHint = style({ marginTop: 6, textAlign: "center", fontSize: 10.5, color: FAINT });
