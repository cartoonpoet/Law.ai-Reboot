import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const heading = themeVars.color.textHeading;
const body = themeVars.color.textSecondary;
const muted = themeVars.color.textMuted;
const faint = themeVars.color.textDisabled;
const primary = themeVars.color.accentPrimary;
const danger = themeVars.color.accentDanger;
const warning = themeVars.color.accentWarning;

// 위험도 틴트(themeVars 에 소프트 색 없음 → color-mix 로 생성, commentItem.css.ts 선례).
const dangerTint = `color-mix(in srgb, ${danger} 12%, transparent)`;
const warningTint = `color-mix(in srgb, ${warning} 16%, transparent)`;
const neutralTint = `color-mix(in srgb, ${muted} 14%, transparent)`;
const primaryTint = `color-mix(in srgb, ${primary} 6%, transparent)`;

// 2컬럼/검토요약 레이아웃 치수 — 스켈레톤(contractDetailSkeleton.css.ts)이 동일 형태를
// 모사해야 해 두 파일이 함께 변하지 않도록 단일출처로 공유한다.
export const LAYOUT_COLUMNS = "1fr 332px";
export const LAYOUT_GAP = 18;
export const FACT_COLUMNS = "repeat(3, 1fr)";
export const FACT_GAP = "18px 20px";

/* 버튼 아이콘 크기(레거시 인라인 style 대체용 토큰 기반 클래스). */
export const btnIcon = style({ width: 14, height: 14 });

/* ── 헤더 ─────────────────────────────── */
export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 16,
});

export const backButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: "none",
  cursor: "pointer",
  color: muted,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: themeVars.font.family,
  marginBottom: 8,
  padding: 0,
  selectors: {
    "&:hover": { color: heading },
  },
});

export const backIcon = style({ width: 13, height: 13 });

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const lockIcon = style({ width: 16, height: 16, color: warning });

export const title = style({
  margin: 0,
  fontSize: 23,
  fontWeight: 800,
  color: heading,
  letterSpacing: "-0.025em",
});

export const meta = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 8,
  fontSize: 12.5,
  color: muted,
});

export const metaCode = style({ fontVariantNumeric: "tabular-nums" });

export const metaSep = style({ color: border });

export const headerActions = style({
  display: "flex",
  gap: 8,
  flexShrink: 0,
});

/* ── 라이프사이클(스테퍼 폴백) ─────────────── */
export const lifecycleCard = style({ marginBottom: 16 });

/* ── 2컬럼 레이아웃 ─────────────────────── */
export const layout = style({
  display: "grid",
  gridTemplateColumns: LAYOUT_COLUMNS,
  gap: LAYOUT_GAP,
  alignItems: "start",
});

export const mainColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: 18,
  minWidth: 0,
});

export const sideColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

/* ── 검토 요약(Fact 그리드) ────────────────── */
export const factGrid = style({
  display: "grid",
  gridTemplateColumns: FACT_COLUMNS,
  gap: FACT_GAP,
});

export const factLabel = style({
  fontSize: 11,
  color: faint,
  fontWeight: 600,
  marginBottom: 5,
});

export const factValue = style({
  fontSize: 13.5,
  color: heading,
  fontWeight: 600,
});

export const purposeBlock = style({
  marginTop: 18,
  paddingTop: 16,
  borderTop: `1px solid ${border}`,
});

export const purposeLabel = style({
  fontSize: 11,
  color: faint,
  fontWeight: 600,
  marginBottom: 6,
});

export const purposeText = style({
  margin: 0,
  fontSize: 13,
  color: body,
  lineHeight: 1.65,
});

/* ── AI 리스크 ───────────────────────── */
export const riskActions = style({ fontSize: 11.5, color: muted });

export const riskActionsHigh = style({ color: danger });

export const riskList = style({
  display: "flex",
  flexDirection: "column",
  gap: 9,
});

export const riskFootnote = style({
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 11.5,
  color: faint,
});

export const footnoteIcon = style({ width: 13, height: 13 });

/* RiskCard — 위험도별 좌측 보더 색은 variant 클래스로 분기 */
export const riskCard = style({
  border: `1px solid ${border}`,
  borderLeft: `3px solid ${muted}`,
  borderRadius: 7,
  padding: "12px 14px",
  background: surface,
});

export const riskCardHigh = style({ borderLeftColor: danger });
export const riskCardMid = style({ borderLeftColor: warning });
export const riskCardLow = style({ borderLeftColor: muted });

export const riskHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
});

export const riskBadge = style({
  fontSize: 10.5,
  fontWeight: 800,
  padding: "1px 7px",
  borderRadius: 4,
});

export const riskBadgeHigh = style({ color: danger, background: dangerTint });
export const riskBadgeMid = style({ color: warning, background: warningTint });
export const riskBadgeLow = style({ color: muted, background: neutralTint });

export const riskClause = style({
  fontSize: 13.5,
  fontWeight: 700,
  color: heading,
});

export const riskFinding = style({
  fontSize: 12.5,
  color: body,
  lineHeight: 1.55,
  marginBottom: 7,
});

export const riskSuggest = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  padding: "7px 10px",
  background: primaryTint,
  borderRadius: 5,
});

export const riskSuggestIcon = style({
  width: 13,
  height: 13,
  color: primary,
  marginTop: 1,
  flexShrink: 0,
});

export const riskSuggestText = style({
  fontSize: 12,
  color: primary,
  fontWeight: 600,
  lineHeight: 1.5,
});

/* ── 검토 액션(사이드바) ─────────────────── */
export const actionStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const stageRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const stageLabel = style({ fontSize: 12.5, color: muted });

export const ownerRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
});

export const ownerInfo = style({ minWidth: 0 });

export const ownerName = style({
  fontSize: 13,
  fontWeight: 700,
  color: heading,
});

export const ownerDept = style({
  fontSize: 11.5,
  color: faint,
  fontWeight: 500,
});

export const ownerRole = style({ fontSize: 11.5, color: muted });

export const divider = style({ height: 1, background: border });

export const transitionGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
});

/* ── 참여자 카드 ─────────────────────── */
export const partyStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const partyRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
});

export const partyInfo = style({ minWidth: 0 });

export const partyName = style({
  fontSize: 13,
  fontWeight: 700,
  color: heading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const partyRole = style({ fontSize: 11.5, color: muted });

/* ── 핵심 정보(KVRow) ───────────────────── */
export const kvRow = style({
  display: "flex",
  borderBottom: `1px solid ${border}`,
});

export const kvRowLast = style({ borderBottom: "none" });

export const kvLabel = style({
  width: 130,
  flexShrink: 0,
  padding: "11px 14px",
  background: surfaceAlt,
  fontSize: 12.5,
  color: muted,
  fontWeight: 600,
});

export const kvValue = style({
  flex: 1,
  padding: "11px 14px",
  fontSize: 13,
  color: heading,
});

export const secureValue = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: warning,
  fontWeight: 700,
});

export const secureIcon = style({ width: 12, height: 12 });

/* ── 첨부 파일 ──────────────────────── */
export const fileList = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
});

export const fileItem = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 10px",
  border: `1px solid ${border}`,
  borderRadius: 7,
});

export const fileIcon = style({
  width: 18,
  height: 18,
  color: primary,
  flexShrink: 0,
});

export const fileInfo = style({ flex: 1, minWidth: 0 });

export const fileName = style({
  fontSize: 12.5,
  fontWeight: 600,
  color: heading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const fileMeta = style({ fontSize: 11, color: faint });

export const fileDownload = style({
  width: 15,
  height: 15,
  color: muted,
  flexShrink: 0,
});
