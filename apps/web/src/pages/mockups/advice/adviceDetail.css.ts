import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 법률자문 상세 — 계약 상세(contractDetail.css) 카드·요약줄 위에 얹는 자문 전용 부품.
 * themeVars + color-mix 파생만 사용(로컬 hex 0). 장식(강조 막대·그라데이션) 없음.
 * ======================================================================= */

const c = themeVars.color;

const HEADING = c.textHeading;
const BODY = c.textSecondary;
const MUTED = c.textMuted;
const FAINT = c.textDisabled;
const SURFACE = c.neutralSurface;
const SURFACE_ALT = c.neutralSurfaceAlt;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = `color-mix(in srgb, ${c.neutralBorder} 50%, transparent)`;
const PRIMARY = c.accentPrimary;
const INFO = c.accentInfo;
const WARNING_DARK = c.accentWarningActive;
const SUCCESS = c.accentSuccess;

/* ── 공통 ── */

export const icon14 = style({ width: 14, height: 14 });

export const sectionLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  color: MUTED,
  marginBottom: 10,
});

export const sectionCount = style({ color: FAINT, fontWeight: 600 });

export const cardBodyStack = style({ display: "flex", flexDirection: "column", gap: 20 });

/* ── 요약줄 보조 ── */

export const glanceValueRow = style({ display: "flex", alignItems: "center", gap: 8 });

export const glanceSub = style({ fontSize: 12, fontWeight: 500, color: MUTED });

/* ── AI 자문 도우미 ── */

export const aiSummary = style({
  margin: 0,
  fontSize: 14,
  lineHeight: 1.7,
  color: HEADING,
  fontWeight: 500,
});

export const issueList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
});

export const issueItem = style({
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.md,
  padding: "11px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const issueNum = style({
  fontSize: 11,
  fontWeight: 700,
  color: PRIMARY,
  fontVariantNumeric: "tabular-nums",
});

export const issueTitle = style({ fontSize: 13, fontWeight: 700, color: HEADING, lineHeight: 1.45 });

export const issueBasis = style({ fontSize: 11.5, color: MUTED, lineHeight: 1.5 });

export const similarList = style({ listStyle: "none", margin: 0, padding: 0 });

export const similarRow = style({
  display: "grid",
  gridTemplateColumns: "112px 1fr auto",
  alignItems: "baseline",
  gap: 12,
  padding: "9px 0",
  borderTop: `1px solid ${BORDER_SUBTLE}`,
  selectors: { "&:first-child": { borderTop: "none", paddingTop: 0 } },
});

export const similarCode = style({ fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" });

export const similarTitle = style({ fontSize: 13, fontWeight: 600, color: HEADING });

export const similarConclusion = style({ display: "block", fontSize: 12, color: BODY, marginTop: 2 });

export const similarDate = style({ fontSize: 12, color: FAINT, fontVariantNumeric: "tabular-nums" });

export const aiFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

export const aiDisclaimer = style({ fontSize: 11.5, color: FAINT });

/* ── 질의 · 회신 스레드 ── */

export const thread = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

export const message = style({ display: "flex", gap: 10, alignItems: "flex-start" });

export const messageMain = style({ flex: 1, minWidth: 0 });

export const messageHead = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  marginBottom: 6,
});

export const messageAuthor = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const messageDept = style({ fontSize: 12, color: MUTED });

export const messageTime = style({
  marginLeft: "auto",
  fontSize: 11.5,
  color: FAINT,
  fontVariantNumeric: "tabular-nums",
});

const kindBase = {
  fontSize: 10.5,
  fontWeight: 700,
  borderRadius: themeVars.radius.sm,
  padding: "1px 7px",
  lineHeight: 1.6,
} as const;

export const messageKind = styleVariants({
  requester: { ...kindBase, color: PRIMARY, background: `color-mix(in srgb, ${PRIMARY} 10%, ${SURFACE})` },
  legal: { ...kindBase, color: INFO, background: `color-mix(in srgb, ${INFO} 12%, ${SURFACE})` },
});

export const bubble = styleVariants({
  requester: {
    background: SURFACE_ALT,
    border: `1px solid ${BORDER}`,
    borderRadius: themeVars.radius.lg,
    padding: "11px 13px",
    fontSize: 13,
    lineHeight: 1.65,
    color: BODY,
  },
  legal: {
    background: `color-mix(in srgb, ${INFO} 6%, ${SURFACE})`,
    border: `1px solid color-mix(in srgb, ${INFO} 18%, ${SURFACE})`,
    borderRadius: themeVars.radius.lg,
    padding: "11px 13px",
    fontSize: 13,
    lineHeight: 1.65,
    color: BODY,
  },
});

export const messageFiles = style({ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 });

export const waiting = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 18,
  padding: "9px 12px",
  borderRadius: themeVars.radius.md,
  background: SURFACE_ALT,
  fontSize: 12.5,
  color: MUTED,
});

export const waitingIcon = style({ width: 14, height: 14, color: WARNING_DARK, flexShrink: 0 });

export const waitingStrong = style({ color: HEADING, fontWeight: 700 });

export const composer = style({
  marginTop: 16,
  paddingTop: 16,
  borderTop: `1px solid ${BORDER_SUBTLE}`,
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const composerActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const composerHint = style({ fontSize: 11.5, color: FAINT });

export const composerButtons = style({ display: "flex", gap: 8 });

/* ── 처리 패널(우측 레일) ── */

export const kvList = style({ margin: 0, display: "flex", flexDirection: "column" });

export const kvRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "9px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none" },
  },
});

export const kvKey = style({ fontSize: 12.5, color: MUTED });

export const kvValue = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 600,
  color: HEADING,
  textAlign: "right",
});

export const kvValueWarn = style({ color: WARNING_DARK });

export const actionButtons = style({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 });

/* ── 결재선(우측 레일) ── */

export const approverList = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 });

export const approverRow = style({ display: "flex", alignItems: "center", gap: 10 });

export const approverMain = style({ flex: 1, minWidth: 0 });

export const approverName = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const approverDept = style({ fontSize: 11.5, color: MUTED, marginTop: 1 });

export const approverSide = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 });

export const approverState = styleVariants({
  done: { fontSize: 11, fontWeight: 600, color: SUCCESS, fontVariantNumeric: "tabular-nums" },
  now: { fontSize: 11, fontWeight: 600, color: PRIMARY },
  wait: { fontSize: 11, fontWeight: 600, color: FAINT },
});

export const approverDimmed = style({ opacity: 0.72 });

/* ── 첨부 · 관련 계약(우측 레일) ── */

export const fileList = style({ display: "flex", flexDirection: "column", gap: 6 });

export const fileTypeIcon = style({ width: 18, height: 18, color: MUTED });

export const relatedRow = style({ display: "flex", flexDirection: "column", gap: 6 });

export const relatedTitle = style({ fontSize: 13, fontWeight: 600, color: HEADING, lineHeight: 1.45 });

export const relatedStage = style({ fontSize: 11.5, color: MUTED });
