import { style, styleVariants } from "@vanilla-extract/css";
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

/* --- 파이프라인 --- */
export const pipelineTabs = style({ padding: "8px 16px 0", borderBottom: `1px solid ${c.neutralBorder}` });

export const stageRow = style({ display: "flex" });
export const stageWrap = style({ display: "flex", alignItems: "center", flex: 1 });
export const stage = style({ flex: 1, padding: "13px 14px 12px", position: "relative" });

export const stageBottleneck = styleVariants({
  danger: { background: `color-mix(in srgb, ${c.accentDanger} 6%, ${c.neutralSurface})` },
  primary: { background: `color-mix(in srgb, ${c.accentPrimary} 6%, ${c.neutralSurface})` },
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
});

export const stageLabel = style({ fontSize: 11, fontWeight: 600, color: FAINT, marginBottom: 8, whiteSpace: "nowrap" });
export const barBox = style({ display: "flex", alignItems: "flex-end", height: 28, marginBottom: 7 });

const barBase = style({ width: "55%", borderRadius: 3 });

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

export const stageCount = style({ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" });

export const countTone = styleVariants({
  danger: { color: c.accentDanger },
  primary: { color: c.accentPrimary },
  success: { color: c.textHeading },
  neutral: { color: c.textHeading },
});

export const stageUnit = style({ fontSize: 11, color: FAINT, marginTop: 1 });
export const chevron = style({ width: 11, height: 11, color: FAINT, flexShrink: 0 });

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

/* --- 항상 떠 있는 AI 비서 --- */
export const fab = style({
  position: "fixed",
  right: 28,
  bottom: 28,
  zIndex: 900,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 48,
  padding: "0 18px 0 14px",
  border: "none",
  borderRadius: 999,
  background: AI_TEXT,
  color: c.textInverse,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  boxShadow: themeVars.shadow.modal,
  cursor: "pointer",
  selectors: { "&:focus-visible": { outline: "none", boxShadow: `${themeVars.shadow.modal}, ${themeVars.shadow.focus}` } },
});

export const fabIcon = style({ width: 18, height: 18, color: c.textInverse });
export const dockBody = style({ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 });
export const chatContext = style({ fontSize: 11.5, color: c.textMuted });

// 최신 메시지가 항상 아래에 보이도록 column-reverse(스크롤 동기화 effect 없이 하단 고정)
export const chatLog = style({ display: "flex", flexDirection: "column-reverse", gap: 8, maxHeight: 280, overflowY: "auto", paddingBottom: 4 });

const bubbleBase = style({ maxWidth: "88%", padding: "8px 11px", borderRadius: 10, fontSize: 13, lineHeight: 1.55 });

export const bubble = {
  user: style([bubbleBase, { alignSelf: "flex-end", background: c.accentPrimary, color: c.textInverse, borderBottomRightRadius: 3 }]),
  assistant: style([bubbleBase, { alignSelf: "flex-start", background: AI_TINT, color: c.textHeading, borderBottomLeftRadius: 3 }]),
};

export const promptForm = style({ display: "flex", gap: 8, width: "100%" });
export const promptInput = style({ flex: 1, minWidth: 0 });
export const chipRow = style({ display: "flex", flexWrap: "wrap", gap: 6 });
export const chip = style({ cursor: "pointer" });
