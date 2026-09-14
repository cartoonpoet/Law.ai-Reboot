import { style, styleVariants, keyframes } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

/* 시안 정본: approval-process-mockup.html ① 결재 대기함. themeVars + color-mix 파생만. */
const PRIMARY = c.accentPrimary;
const PRIMARY_DARK = c.accentPrimaryActive;
const PRIMARY_SOFT = `color-mix(in srgb, ${c.accentPrimary} 10%, ${c.neutralSurface})`;
const PRIMARY_TINT = `color-mix(in srgb, ${c.accentPrimary} 6%, ${c.neutralSurface})`;
const PRIMARY_BORDER = `color-mix(in srgb, ${c.accentPrimary} 35%, ${c.neutralSurface})`;
const WARNING_DARK = c.accentWarningActive;
const WARNING_TINT = `color-mix(in srgb, ${c.accentWarning} 16%, ${c.neutralSurface})`;
const SUCCESS = c.accentSuccessActive;
const SUCCESS_TINT = `color-mix(in srgb, ${c.accentSuccess} 14%, ${c.neutralSurface})`;
const DANGER = c.accentDangerActive;
const DANGER_TINT = `color-mix(in srgb, ${c.accentDanger} 12%, ${c.neutralSurface})`;
const HEADING = c.textHeading;
const MUTED = c.textMuted;
const FAINT = c.neutralBorderStrong;
const SURFACE = c.neutralSurface;
const SURFACE_ALT = c.neutralSurfaceAlt;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = c.neutralSurfaceRaised;

export const phead = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
});

export const title = style({
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: HEADING,
  letterSpacing: "-0.025em",
});

export const pdesc = style({ margin: "6px 0 0", fontSize: 13, color: MUTED });

/* --- 통계 --- */
export const stats = style({ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 });

export const stat = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.lg,
  padding: "13px 18px",
  minWidth: 150,
  boxShadow: themeVars.shadow.raised,
});

export const statHot = style({
  borderColor: PRIMARY_BORDER,
  background: `linear-gradient(180deg, ${SURFACE}, ${PRIMARY_TINT})`,
});

export const statLabel = style({ fontSize: 12, fontWeight: 600, color: MUTED });

export const statValue = style({
  fontSize: 22,
  fontWeight: 800,
  color: HEADING,
  marginTop: 3,
  fontVariantNumeric: "tabular-nums",
});

export const statValueHot = style({ color: PRIMARY });
export const statUnit = style({ fontSize: 12, fontWeight: 600, color: FAINT, marginLeft: 2 });

/* --- 표 --- */
export const card = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.lg,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
});

export const tabs = style({
  display: "flex",
  gap: 2,
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  padding: "0 8px",
});

export const tab = style({
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: MUTED,
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
  padding: "12px 14px",
  cursor: "pointer",
});

export const tabOn = style({
  color: PRIMARY,
  borderBottomColor: PRIMARY,
  fontWeight: 700,
});

export const tabCount = style({
  display: "inline-flex",
  minWidth: 18,
  height: 18,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 99,
  background: PRIMARY_SOFT,
  color: PRIMARY_DARK,
  fontSize: 11,
  fontWeight: 800,
  padding: "0 5px",
  marginLeft: 5,
});

export const tableWrap = style({ overflowX: "auto" });

export const table = style({ width: "100%", borderCollapse: "collapse" });

export const th = style({
  fontSize: 12,
  fontWeight: 700,
  color: MUTED,
  textAlign: "left",
  padding: "11px 14px",
  background: SURFACE_ALT,
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
});

export const td = style({
  fontSize: 13,
  padding: "13px 14px",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  verticalAlign: "middle",
  selectors: {
    "tr:last-child &": { borderBottom: "none" },
  },
});

export const rowHot = style({ background: PRIMARY_TINT });

export const doc = style({ display: "flex", flexDirection: "column", gap: 3 });

export const docTitle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontWeight: 700,
  color: HEADING,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: PRIMARY, textDecoration: "underline" },
  },
});

export const docMeta = style({ fontSize: 12, color: FAINT, fontVariantNumeric: "tabular-nums" });

const dotPulse = keyframes({
  "0%": { boxShadow: `0 0 0 0 color-mix(in srgb, ${PRIMARY} 40%, transparent)` },
  "70%": { boxShadow: `0 0 0 7px color-mix(in srgb, ${PRIMARY} 0%, transparent)` },
  "100%": { boxShadow: `0 0 0 0 color-mix(in srgb, ${PRIMARY} 0%, transparent)` },
});

// 내 차례 라이브 점 — 부드러운 펄스(reduced-motion 존중).
export const liveDot = style({
  width: 8,
  height: 8,
  borderRadius: 99,
  background: PRIMARY,
  flexShrink: 0,
  animation: `${dotPulse} 1.6s ease-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

const badgeBase = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11.5,
  fontWeight: 700,
  borderRadius: 99,
  padding: "3px 10px",
  whiteSpace: "nowrap",
});

export const badge = styleVariants({
  kind: [badgeBase, { background: PRIMARY_SOFT, color: PRIMARY_DARK }],
  agree: [badgeBase, { background: WARNING_TINT, color: WARNING_DARK }],
  approved: [badgeBase, { background: SUCCESS_TINT, color: SUCCESS }],
  rejected: [badgeBase, { background: DANGER_TINT, color: DANGER }],
  neutral: [badgeBase, { background: SURFACE_ALT, color: MUTED }],
});

export const person = style({ display: "flex", alignItems: "center", gap: 8 });

export const personName = style({ fontWeight: 600, color: HEADING });

export const personDept = style({ fontSize: 12, color: FAINT });

export const stepCell = style({ display: "inline-flex", alignItems: "center", gap: 6 });

export const stepPos = style({
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  color: HEADING,
});

export const stepTotal = style({ fontSize: "inherit", color: FAINT, fontWeight: 500 });

// 경과 — 당일은 흐리게, 하루 이상 지난 결재는 경고색.
export const elapsed = styleVariants({
  today: { fontSize: 12, fontWeight: 500, color: FAINT },
  overdue: { fontSize: 12, fontWeight: 700, color: WARNING_DARK },
});

export const empty = style({
  padding: "36px 16px",
  textAlign: "center",
  fontSize: 13,
  color: FAINT,
});
