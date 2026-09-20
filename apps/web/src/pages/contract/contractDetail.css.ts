import { style, styleVariants, keyframes } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 계약 상세(detail v3) 디자인 시스템 — themeVars + color-mix 파생만(로컬 hex 0).
 * 시안 정본: contract-list-detail-mockup.html (DETAIL v3).
 * 시안 :root var → themeVars 매핑은 02-context.md L87~113 근거.
 * tint/dark/soft 변형 토큰은 themeVars 에 없으므로 color-mix 로 파생(기존 css.ts 관행).
 * ======================================================================= */

const c = themeVars.color;

/* --- 시안 var → themeVars 파생 토큰(일원화) --- */
const PRIMARY = c.accentPrimary;
const PRIMARY_DARK = c.accentPrimaryActive;
const PRIMARY_SOFT = `color-mix(in srgb, ${c.accentPrimary} 10%, ${c.neutralSurface})`;
const PRIMARY_TINT = `color-mix(in srgb, ${c.accentPrimary} 6%, ${c.neutralSurface})`;
const SUCCESS = c.accentSuccess;
const SUCCESS_TINT = `color-mix(in srgb, ${c.accentSuccess} 14%, ${c.neutralSurface})`;
const DANGER = c.accentDanger;
const DANGER_TINT = `color-mix(in srgb, ${c.accentDanger} 12%, ${c.neutralSurface})`;
const WARNING_DARK = c.accentWarningActive;
const WARNING_TINT = `color-mix(in srgb, ${c.accentWarning} 16%, ${c.neutralSurface})`;
const INFO = c.accentInfo;
const INFO_TINT = `color-mix(in srgb, ${c.accentInfo} 12%, ${c.neutralSurface})`;
const INFO_BORDER = `color-mix(in srgb, ${c.accentInfo} 28%, ${c.neutralSurface})`;

const HEADING = c.textHeading;
const BODY = c.textSecondary;
const MUTED = c.textMuted;
const FAINT = c.textDisabled;
const SURFACE = c.neutralSurface;
const SURFACE_ALT = c.neutralSurfaceAlt;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = `color-mix(in srgb, ${c.neutralBorder} 50%, transparent)`;

/* --- 레이아웃 치수(스켈레톤/마크업 단일출처 — Gen-Phase 4 가 import) --- */
export const LAYOUT = {
  pageMaxWidth: 1200,
  railWidth: 320, // 우측 레일 고정폭(rail-grid)
  railGridGap: 16,
  stackGap: 16,
  glanceColumns: 6, // at-a-glance 셀 수
  factsColumns: 2, // facts 2열
  factsRowGap: 20,
  factsColGap: 24,
  cardRadius: 8, // radius.lg 상응
  stickyTop: 16,
} as const;

/* =========================================================================
 * 레이아웃
 * ======================================================================= */
/* AppShell main 이 이미 padding(22px 24px 48px)·풀폭을 제공하므로, 상세도
 * 요청 폼·목록과 동일하게 자체 max-width/중앙정렬/가로 패딩을 두지 않는다
 * (이중 패딩·폭 불일치로 좌우 여백이 달라지던 문제 해소). */
export const page = style({});

export const backlink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: MUTED,
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 10,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: "inherit",
  selectors: { "&:hover": { color: PRIMARY_DARK } },
});

export const hero = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 14,
});

export const heroTitleRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
});

export const heroTitle = style({
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: HEADING,
  letterSpacing: "-.025em",
  lineHeight: 1.3,
});

export const heroActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

export const hmeta = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
  fontSize: 12.5,
  color: MUTED,
  flexWrap: "wrap",
});

export const hcode = style({ fontVariantNumeric: "tabular-nums" });

export const sep = style({ color: BORDER });

export const railGrid = style({
  display: "grid",
  gridTemplateColumns: `1fr ${LAYOUT.railWidth}px`,
  gap: LAYOUT.railGridGap,
  alignItems: "start",
});

export const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: LAYOUT.stackGap,
});

export const sticky = style({ position: "sticky", top: LAYOUT.stickyTop });

/* =========================================================================
 * at-a-glance strip(6셀 그리드)
 * ======================================================================= */
export const glance = style({
  display: "grid",
  gridTemplateColumns: `repeat(${LAYOUT.glanceColumns}, 1fr)`,
  gap: 1,
  background: BORDER_SUBTLE,
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  overflow: "hidden",
  marginBottom: 16,
  boxShadow: themeVars.shadow.raised,
});

export const gcell = style({ background: SURFACE, padding: "14px 16px" });

export const gl = style({
  fontSize: 10.5,
  color: FAINT,
  fontWeight: 700,
  letterSpacing: ".03em",
  textTransform: "uppercase",
  marginBottom: 6,
});

export const gv = style({ fontSize: 14, fontWeight: 700, color: HEADING });

export const gvWarn = style({ color: WARNING_DARK });

export const gauge = style({ display: "flex", alignItems: "center", gap: 8 });

export const gbar = style({
  flex: 1,
  height: 6,
  borderRadius: 99,
  background: SURFACE_ALT,
  overflow: "hidden",
});

export const gbarFill = style({ display: "block", height: "100%", background: PRIMARY });

/* =========================================================================
 * 카드(시안 .card / .chead / .cbody) — lawkit Card 미사용 시 자체 카드
 * ======================================================================= */
export const card = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
});

export const chead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 18px",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  fontSize: 14,
  fontWeight: 700,
  color: HEADING,
});

export const cheadActions = style({ marginLeft: "auto", display: "flex", gap: 8 });

export const cbody = style({ padding: 18 });

/* =========================================================================
 * facts 그리드
 * ======================================================================= */
export const grouplabel = style({
  fontSize: 11,
  fontWeight: 800,
  color: MUTED,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  margin: "4px 0 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  selectors: {
    "&::after": { content: "''", flex: 1, height: 1, background: BORDER_SUBTLE },
  },
});

export const facts = style({
  display: "grid",
  gridTemplateColumns: `repeat(${LAYOUT.factsColumns}, 1fr)`,
  gap: `${LAYOUT.factsRowGap}px ${LAYOUT.factsColGap}px`,
});

export const factsCols3 = style({ gridTemplateColumns: "repeat(3, 1fr)" });

export const span2 = style({ gridColumn: "1 / -1" });

export const fact = style({ minWidth: 0 });

export const fl = style({
  fontSize: 11,
  color: FAINT,
  fontWeight: 600,
  marginBottom: 5,
  letterSpacing: ".01em",
});

export const fv = style({
  fontSize: 13.5,
  color: HEADING,
  fontWeight: 600,
  wordBreak: "break-word",
  lineHeight: 1.45,
});

/* =========================================================================
 * 자체 칩(lawkit Badge 부재 — themeVars 자체 제작)
 * ======================================================================= */
/* 빈 옵션 필드: 중립 "없음" */
export const emptychip = style({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11.5,
  fontWeight: 600,
  background: SURFACE_ALT,
  border: `1px solid ${BORDER_SUBTLE}`,
  color: FAINT,
  borderRadius: 99,
  padding: "2px 8px",
});

/* 액션 필요한 빈 값: 경고 "⚠ 미배정" */
export const needchip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  background: WARNING_TINT,
  color: WARNING_DARK,
  borderRadius: 99,
  padding: "2px 9px",
});

export const needchipIcon = style({ width: 12, height: 12, color: WARNING_DARK });

/* 분류 path 칩(crumb b 태그) */
export const crumb = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
});

export const crumbItem = style({
  fontWeight: 600,
  color: HEADING,
  background: SURFACE_ALT,
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.md,
  padding: "1px 7px",
  fontSize: 12,
});

/* 필수 표식(minitag) */
export const minitag = style({
  fontSize: 11,
  fontWeight: 700,
  background: DANGER_TINT,
  color: DANGER,
  borderRadius: themeVars.radius.sm,
  padding: "2px 8px",
});

/* 부서 참조 칩(chip-s) */
export const chipS = style({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11.5,
  fontWeight: 600,
  color: PRIMARY_DARK,
  background: PRIMARY_SOFT,
  borderRadius: 99,
  padding: "3px 10px",
});

/* 금액 칩(moneychip + 색 변형) */
export const moneychip = style({
  display: "inline-block",
  fontSize: 11.5,
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: themeVars.radius.md,
  margin: "0 4px 4px 0",
});

export const moneychipColor = styleVariants({
  blue: { background: PRIMARY_SOFT, color: PRIMARY_DARK },
  red: { background: DANGER_TINT, color: DANGER },
  green: { background: SUCCESS_TINT, color: SUCCESS },
});

/* =========================================================================
 * 리치 콘텐츠 블록(검토내용 rblock)
 * ======================================================================= */
export const rblock = style({
  padding: "16px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none", paddingBottom: 0 },
  },
});

export const rbt = style({
  fontSize: 13,
  fontWeight: 700,
  color: HEADING,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 7,
});

export const rbtxt = style({ fontSize: 13, color: BODY, lineHeight: 1.65 });

/* =========================================================================
 * AI 리스크(mock)
 * ======================================================================= */
// 위험도는 옆의 rbadge(색+글자)가 이미 말해 준다 — 카드 테두리는 전부 같은 중립색으로 두고,
// 위험도별로 다르게 칠하는 자리를 배지 하나로만 좁힌다(막대·배경색 이중 표시 금지).
export const risk = style({
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  padding: "12px 14px",
});

export const riskHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
});

export const rbadge = style({
  fontSize: 10,
  fontWeight: 800,
  padding: "2px 7px",
  borderRadius: themeVars.radius.sm,
});

export const rbadgeLevel = styleVariants({
  high: { color: DANGER, background: DANGER_TINT },
  mid: { color: WARNING_DARK, background: WARNING_TINT },
  low: { color: MUTED, background: SURFACE_ALT },
});

export const riskClause = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const riskFinding = style({ fontSize: 12.5, color: BODY, lineHeight: 1.55 });

/* =========================================================================
 * 결재선(approval line)
 * ======================================================================= */
export const apvrow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none" },
  },
});

export const apvnum = style({
  width: 22,
  height: 22,
  borderRadius: 99,
  background: SURFACE_ALT,
  color: MUTED,
  fontSize: 11,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const apvnumDone = style({ background: PRIMARY, color: themeVars.color.textInverse });

// 내 차례 결재 스텝 — 펄스 링(reduced-motion 존중).
const ringPulse = keyframes({
  "0%": { boxShadow: `0 0 0 0 color-mix(in srgb, ${PRIMARY} 30%, transparent)` },
  "70%": { boxShadow: `0 0 0 8px color-mix(in srgb, ${PRIMARY} 0%, transparent)` },
  "100%": { boxShadow: `0 0 0 0 color-mix(in srgb, ${PRIMARY} 0%, transparent)` },
});

export const apvnumActive = style({
  background: SURFACE,
  border: `2px solid ${PRIMARY}`,
  color: PRIMARY,
  animation: `${ringPulse} 2s ease-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const apvnumRejected = style({ background: DANGER, color: themeVars.color.textInverse });

export const apvname = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const apvdept = style({
  fontSize: 11.5,
  color: FAINT,
  fontWeight: 500,
  marginLeft: 5,
});

export const apvtype = style({
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 99,
  padding: "2px 9px",
  background: SURFACE_ALT,
  color: MUTED,
  marginLeft: "auto",
});

export const apvtypeKind = styleVariants({
  draft: { background: PRIMARY_SOFT, color: PRIMARY_DARK },
  approve: { background: WARNING_TINT, color: WARNING_DARK },
  agree: { background: INFO_TINT, color: INFO },
  refer: { background: SURFACE_ALT, color: MUTED },
});

export const apvstat = style({ fontSize: 11, fontWeight: 700 });

export const apvstatKind = styleVariants({
  done: { color: SUCCESS },
  rejected: { color: DANGER },
  now: { color: PRIMARY },
  wait: { color: FAINT },
});

export const apvcomment = style({
  fontSize: 12,
  color: MUTED,
  background: SURFACE_ALT,
  borderRadius: themeVars.radius.md,
  padding: "8px 10px",
  lineHeight: 1.5,
  margin: "2px 0 8px 32px",
});

/* =========================================================================
 * 상신 사전점검 / 결재 처리(승인·반려) — 우측 레일 검토 액션 카드 확장
 * ======================================================================= */

export const precheckList = style({
  display: "flex",
  flexDirection: "column",
  gap: 9,
  marginBottom: 12,
});

export const precheckRow = style({
  display: "flex",
  gap: 9,
  fontSize: 13,
  lineHeight: 1.5,
  alignItems: "flex-start",
});

export const precheckIcon = style({
  width: 18,
  height: 18,
  borderRadius: 99,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 1,
});

export const precheckIconOk = style({ background: SUCCESS_TINT, color: SUCCESS });
export const precheckIconWarn = style({ background: WARNING_TINT, color: WARNING_DARK });

export const precheckLabel = style({ color: HEADING, fontWeight: 700 });

export const precheckSub = style({
  display: "block",
  fontSize: 12,
  color: FAINT,
  marginTop: 1,
});

// 내 차례 결재 액션 박스 — 은은한 브리딩 글로우(reduced-motion 존중).
const boxGlow = keyframes({
  "0%": { boxShadow: "none", borderColor: `color-mix(in srgb, ${PRIMARY} 30%, ${SURFACE})` },
  "50%": {
    boxShadow: `0 0 12px 0 color-mix(in srgb, ${PRIMARY} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${PRIMARY} 55%, ${SURFACE})`,
  },
  "100%": { boxShadow: "none", borderColor: `color-mix(in srgb, ${PRIMARY} 30%, ${SURFACE})` },
});

export const decideBox = style({
  marginTop: 4,
  background: PRIMARY_TINT,
  border: `1px solid color-mix(in srgb, ${PRIMARY} 30%, ${SURFACE})`,
  borderRadius: LAYOUT.cardRadius,
  padding: 12,
  animation: `${boxGlow} 2.6s ease-in-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const decideLabel = style({
  fontSize: 12,
  fontWeight: 800,
  color: PRIMARY_DARK,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 5,
});

export const decideTextarea = style({
  width: "100%",
  fontFamily: "inherit",
  fontSize: 12.5,
  color: HEADING,
  background: SURFACE,
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: themeVars.radius.md,
  padding: "9px 10px",
  resize: "vertical",
  minHeight: 58,
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: PRIMARY,
      boxShadow: themeVars.shadow.focus,
    },
  },
});

export const decideButtons = style({
  display: "flex",
  gap: 8,
  marginTop: 9,
});

/* =========================================================================
 * 우측 레일(문서 / 검토 액션) + 비용 안내
 * ======================================================================= */
/* 비용 안내(lawkit Alert 사용 가능, 자체 박스용 보조 클래스) */
export const alertInfo = style({
  display: "flex",
  gap: 9,
  background: INFO_TINT,
  border: `1px solid ${INFO_BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  padding: "10px 12px",
  fontSize: 12,
  color: INFO,
  lineHeight: 1.5,
});

export const alertInfoIcon = style({ color: INFO });

/* 문서 칩/링크 */
export const docrow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const docpill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: SURFACE_ALT,
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  padding: "5px 10px",
  fontSize: 12,
  color: HEADING,
  fontWeight: 600,
});

export const docname = style({
  fontSize: 12.5,
  color: HEADING,
  fontWeight: 600,
  wordBreak: "break-word",
});

export const docmeta = style({ fontSize: 11, color: FAINT, marginLeft: "auto", flexShrink: 0 });

export const flink = style({
  color: PRIMARY,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  background: "none",
  border: "none",
  fontFamily: "inherit",
  selectors: {
    "&:hover": { color: PRIMARY_DARK, textDecoration: "underline" },
  },
});

export const flinkGreen = style({ color: SUCCESS });

// 업로드 안 된 레거시 파일(metadata-only) — 미리보기/비교 비활성.
export const flinkDisabled = style({
  color: MUTED,
  cursor: "not-allowed",
  selectors: { "&:hover": { textDecoration: "none", color: MUTED } },
});

/* 키-값 행(우측 레일 akv) */
export const akv = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 0",
  fontSize: 12.5,
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const akvKey = style({ color: MUTED });

export const akvValue = style({ color: HEADING, fontWeight: 600, textAlign: "right" });

/* 액션 버튼 열(검토 액션 카드) */
export const actionRow = style({ display: "flex", flexDirection: "column", gap: 8 });

/* 빈 상태 안내 */
export const empty = style({
  textAlign: "center",
  color: FAINT,
  fontSize: 12.5,
  padding: 24,
});

/* 버튼 아이콘 크기(레거시 인라인 style 대체용 토큰 기반 클래스). */
export const btnIcon = style({ width: 14, height: 14 });

/* =========================================================================
 * 아이콘 색/치수 클래스(Icon 인라인 style 대체 — 신규 인라인 0)
 * ======================================================================= */
export const lockIcon = style({ width: 16, height: 16, color: WARNING_DARK });

export const backIcon = style({ width: 13, height: 13 });

export const cheadIcon = style({ width: 16, height: 16, color: PRIMARY });

export const cheadIconMuted = style({ width: 16, height: 16, color: MUTED });

export const fileIcon = style({ width: 18, height: 18, color: PRIMARY, flexShrink: 0 });

export const noteIcon = style({ width: 13, height: 13, color: FAINT, flexShrink: 0 });

/* =========================================================================
 * hero / next-step 안내 / 결재선 우측 진행 라벨 / 다음 단계 강조
 * ======================================================================= */
export const heroEyebrow = style({
  fontSize: 12,
  fontWeight: 700,
  color: PRIMARY,
  letterSpacing: ".02em",
  marginBottom: 4,
});

export const nextHint = style({
  marginTop: 10,
  fontSize: 12,
  color: MUTED,
  textAlign: "center",
});

export const nextHintAccent = style({ color: PRIMARY, fontWeight: 700 });

/* gv 안의 보조(사업자번호 등) 약한 텍스트 */
export const fvFaint = style({ color: FAINT, fontWeight: 500 });

/* 검토 액션 — 현재 단계 행 / 담당자 행 / 안내 / 버튼 그리드 */
export const actionStatusRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const actionStatusLabel = style({ fontSize: 12.5, color: MUTED });

export const assignee = style({ display: "flex", alignItems: "center", gap: 9 });

export const assigneeMain = style({ minWidth: 0 });

export const assigneeName = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const assigneeTeam = style({ fontSize: 11.5, color: FAINT, fontWeight: 500 });

export const assigneeRole = style({ fontSize: 11.5, color: MUTED });

export const actionDivider = style({ height: 1, background: BORDER_SUBTLE });

export const actionGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
});

export const actionNotice = style({
  fontSize: 12,
  color: MUTED,
  lineHeight: 1.5,
  background: SURFACE_ALT,
  borderRadius: themeVars.radius.md,
  padding: "9px 11px",
});

/* AI 리스크 헤더 우측 카운트 */
export const riskCount = style({ marginLeft: "auto", fontSize: 11.5, color: MUTED });

export const riskCountHigh = style({ color: DANGER, fontWeight: 700 });

/* 결재선 헤더 우측 안내 */
export const cheadNote = style({ marginLeft: "auto", fontSize: 11.5, color: MUTED, fontWeight: 500 });

/* 결재선 진행 상태 라벨(s-now 강조) */
export const apvstatWrap = style({ marginLeft: 10 });

/* 문서 레일 — 그룹/파일행 */
export const docGroup = style({ display: "flex", flexDirection: "column", gap: 10 });

export const docGroupLabel = style({
  fontSize: 11,
  color: FAINT,
  fontWeight: 600,
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const docFileRow = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 10px",
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.md,
});

export const docFileMain = style({ flex: 1, minWidth: 0 });

export const docFileName = style({
  fontSize: 12,
  fontWeight: 600,
  color: HEADING,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const docFileLinks = style({ display: "flex", gap: 8, marginTop: 2 });

export const docEmpty = style({ fontSize: 11.5, color: FAINT });

/* glance 셀 안의 gauge 퍼센트 텍스트 */
export const gaugeVal = style({ fontSize: 12.5, fontWeight: 700, color: HEADING });

/* 검토내용/facts 빈 상태(서술형 카드가 통째로 비었을 때) */
export const blockEmpty = style({ fontSize: 13, color: FAINT, padding: "8px 0" });

/* moneychip 컨테이너(줄바꿈 허용) */
export const moneyChips = style({ display: "flex", flexWrap: "wrap" });

/* 참조 칩 묶음 */
export const chipRow = style({ display: "flex", flexWrap: "wrap", gap: 6 });

/* 관련문서/URL 링크 목록 */
export const linkList = style({ display: "flex", flexDirection: "column", gap: 4 });

/* =========================================================================
 * 체결 처리 액션 패널 강조(시안 .actpanel) — 성공색 테두리 + 은은한 글로우.
 * ======================================================================= */
const successGlow = keyframes({
  "0%": { boxShadow: "none", borderColor: `color-mix(in srgb, ${SUCCESS} 35%, ${SURFACE})` },
  "50%": {
    boxShadow: `0 0 14px 0 color-mix(in srgb, ${SUCCESS} 18%, transparent)`,
    borderColor: `color-mix(in srgb, ${SUCCESS} 60%, ${SURFACE})`,
  },
  "100%": { boxShadow: "none", borderColor: `color-mix(in srgb, ${SUCCESS} 35%, ${SURFACE})` },
});

export const actionPanelHighlight = style({
  borderColor: `color-mix(in srgb, ${SUCCESS} 35%, ${SURFACE})`,
  borderWidth: 1.5,
  background: `color-mix(in srgb, ${SUCCESS} 4%, ${SURFACE})`,
  animation: `${successGlow} 2.4s ease-in-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});
