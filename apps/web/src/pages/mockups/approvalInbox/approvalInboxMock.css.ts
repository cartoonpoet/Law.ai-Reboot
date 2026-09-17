import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 결재 대기함 시안 3종 공통 — themeVars 만 사용. */
const c = themeVars.color;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = `color-mix(in srgb, ${c.neutralBorder} 55%, transparent)`;
const SURFACE = c.neutralSurface;
const HEADING = c.textHeading;
const BODY = c.textSecondary;
const MUTED = c.textMuted;
const FAINT = c.textDisabled;
const PRIMARY = c.accentPrimary;

/* ── 공통: 시안 안내 + 페이지 머리 ── */

export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const pageHead = style({ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 });

export const titleGroup = style({ display: "flex", flexDirection: "column", gap: 7 });

export const pageTitle = style({ margin: 0, fontSize: 22, fontWeight: 800, color: HEADING, letterSpacing: "-0.025em" });

export const headSummary = style({ margin: 0, fontSize: 13, color: MUTED });

export const headStrong = style({ color: HEADING, fontWeight: 700 });

export const mono = style({ fontVariantNumeric: "tabular-nums" });

const waitBase = { fontSize: 11.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

export const wait = styleVariants({
  today: { ...waitBase, fontWeight: 600, color: MUTED },
  late: { ...waitBase, color: c.accentWarningActive },
  overdue: { ...waitBase, color: c.accentDanger },
});

export const aiLine = style({ margin: 0, display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, lineHeight: 1.55 });

export const aiIcon = style({ width: 14, height: 14, flexShrink: 0, marginTop: 2 });

export const aiTone = styleVariants({
  danger: { color: c.accentDanger },
  warning: { color: c.accentWarningActive },
  info: { color: c.accentInfo },
});

/* ── A. 처리 큐형 ── */

export const queueToolbar = style({ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" });

export const queueList = style({ display: "flex", flexDirection: "column", gap: 10 });

export const queueCard = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 14,
  alignItems: "start",
  padding: "16px 18px",
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.lg,
});

export const queueCardSelected = style({ borderColor: PRIMARY });

export const queueMain = style({ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 });

export const queueTitleRow = style({ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" });

export const queueTitle = style({ fontSize: 15, fontWeight: 700, color: HEADING });

export const queueMeta = style({ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: MUTED });

export const factRow = style({ display: "flex", gap: 18, flexWrap: "wrap" });

export const fact = style({ display: "flex", flexDirection: "column", gap: 2 });

export const factLabel = style({ fontSize: 11, color: FAINT, fontWeight: 600 });

export const factValue = style({ fontSize: 12.5, color: BODY, fontWeight: 600 });

export const queueSide = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 });

export const buttonRow = style({ display: "flex", gap: 6 });

/* ── B. 목록 + 미리보기형 ── */

export const split = style({ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" });

export const splitList = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.lg,
  overflow: "hidden",
});

export const splitListHead = style({ padding: "10px 12px", borderBottom: `1px solid ${BORDER_SUBTLE}` });

export const splitItem = style({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  padding: "12px 14px",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:last-child": { borderBottom: "none" },
    "&:hover": { background: c.neutralSurfaceAlt },
    "&:focus-visible": { outline: "none", boxShadow: themeVars.shadow.focus },
  },
});

export const splitItemActive = style({ background: `color-mix(in srgb, ${PRIMARY} 7%, ${SURFACE})` });

export const splitItemTop = style({ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" });

export const splitItemTitle = style({ fontSize: 13.5, fontWeight: 700, color: HEADING });

export const splitItemMeta = style({ fontSize: 11.5, color: MUTED });

export const preview = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.lg,
  display: "flex",
  flexDirection: "column",
});

export const previewHead = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  padding: "18px 20px",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
});

export const previewTitle = style({ margin: "6px 0 4px", fontSize: 19, fontWeight: 800, color: HEADING });

export const previewBody = style({ display: "grid", gridTemplateColumns: "1fr 280px", gap: 0 });

export const previewMain = style({ display: "flex", flexDirection: "column", gap: 18, padding: 20 });

export const previewSide = style({ padding: 20, borderLeft: `1px solid ${BORDER_SUBTLE}` });

export const sectionLabel = style({ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 8 });

export const factGrid = style({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px" });

export const decide = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "16px 20px",
  borderTop: `1px solid ${BORDER_SUBTLE}`,
});

export const decideButtons = style({ display: "flex", justifyContent: "flex-end", gap: 8 });

/* ── C. 유형별 묶음형 ── */

export const groupSection = style({ display: "flex", flexDirection: "column", gap: 8 });

export const groupHead = style({ display: "flex", alignItems: "center", gap: 8 });

export const groupTitle = style({ margin: 0, fontSize: 14, fontWeight: 700, color: HEADING });

export const groupCount = style({ fontSize: 13, fontWeight: 600, color: MUTED });

// 묶음마다 칸 너비가 같게 고정 폭으로 그린다.
export const table = style({ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" });

export const col = styleVariants({
  doc: { width: "34%" },
  key: { width: "26%" },
  submitter: { width: "14%" },
  step: { width: "10%" },
  wait: { width: "9%" },
  action: { width: "7%" },
});

export const th = style({
  padding: "9px 14px",
  fontSize: 11.5,
  fontWeight: 700,
  color: MUTED,
  textAlign: "left",
  background: c.neutralSurfaceAlt,
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  whiteSpace: "nowrap",
});

export const td = style({
  padding: "11px 14px",
  fontSize: 12.5,
  color: BODY,
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  verticalAlign: "middle",
  selectors: { "tr:last-child > &": { borderBottom: "none" } },
});

export const rowTitle = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const rowSub = style({ fontSize: 11.5, color: MUTED, marginTop: 2 });

export const textRight = style({ textAlign: "right" });
