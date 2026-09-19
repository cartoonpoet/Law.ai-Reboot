import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 송무 시안 — 계약 상세(contractDetail.css)·계약 조회(contractList.css) 위에 얹는
 * 송무 전용 부품만 둔다. 카드/요약줄/facts/레일은 계약·자문 것을 그대로 쓴다.
 * themeVars + color-mix 파생만 사용(로컬 hex 0).
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
const PRIMARY_DARK = c.accentPrimaryActive;
const PRIMARY_SOFT = `color-mix(in srgb, ${PRIMARY} 10%, ${SURFACE})`;
const PRIMARY_TINT = `color-mix(in srgb, ${PRIMARY} 6%, ${SURFACE})`;
const SUCCESS_TINT = `color-mix(in srgb, ${c.accentSuccess} 14%, ${SURFACE})`;
const WARNING_TINT = `color-mix(in srgb, ${c.accentWarning} 16%, ${SURFACE})`;
const WARNING_DARK = c.accentWarningActive;

/* ── 시안 안내 문구(실제 화면에는 없는 설명 박스) ── */

export const mockNote = style({ marginBottom: 16 });

/* ── 목록 머리·필터(계약 조회와 같은 리듬) ── */

export const filters = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" });

export const filterSelect = style({ width: 150 });

export const search = style({ flex: 1, minWidth: 220, maxWidth: 360 });

export const searchIcon = style({ width: 15, height: 15, color: FAINT });

export const pager = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px 14px",
});

/* ── 표 셀(계약·자문 목록과 같은 글자 크기·색) ── */

export const caseNo = style({
  fontSize: 12,
  color: MUTED,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const cellStack = style({ display: "flex", flexDirection: "column", gap: 2 });

export const cellRow = style({ display: "inline-flex", alignItems: "center", gap: 6 });

export const caseNameLink = style({ fontSize: 13, fontWeight: 600, color: PRIMARY });

export const meta = style({ fontSize: 11.5, color: MUTED });

export const metaStrong = style({ fontSize: 12.5, color: BODY, fontWeight: 600 });

export const money = style({ fontSize: 12.5, fontWeight: 700, color: HEADING, fontVariantNumeric: "tabular-nums" });

export const dateText = style({ fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" });

export const nextDateNone = style({ fontSize: 12, color: MUTED });

/* ── 카드 머리 보조(자문 상세와 같은 위치) ── */

export const cheadTitle = style({ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const cheadBadge = style({ marginLeft: 2, flexShrink: 0 });

/* ── B안 카드형 목록 ── */

export const boardList = style({ display: "flex", flexDirection: "column", gap: 16 });

export const boardStats = style({ marginBottom: 16 });

export const boardBody = style({ display: "flex", alignItems: "flex-start", gap: 16 });

export const boardMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 });

export const boardActions = style({ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 });

/* 낼 서면 안내 줄 */
export const todoRow = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 10px",
  borderRadius: themeVars.radius.md,
  background: WARNING_TINT,
  fontSize: 12.5,
  fontWeight: 600,
  color: WARNING_DARK,
});

export const todoIcon = style({ width: 14, height: 14, color: WARNING_DARK, flexShrink: 0 });

/* AI 한 줄(자문·계약의 AI 문장과 같은 아이콘 색·글자 크기) */
export const aiRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 7,
  padding: "9px 11px",
  borderRadius: themeVars.radius.md,
  background: PRIMARY_TINT,
  border: `1px solid color-mix(in srgb, ${PRIMARY} 14%, ${SURFACE})`,
});

export const aiIcon = style({ width: 14, height: 14, color: PRIMARY, flexShrink: 0, marginTop: 2 });

export const aiText = style({ fontSize: 12.5, lineHeight: 1.55, color: BODY });

/* ── 로아이 사건 도우미 카드(자문 AI 카드와 같은 구성) ── */

export const aiBody = style({ display: "flex", flexDirection: "column", gap: 18 });

export const aiSectionLabel = style({ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 8 });

export const aiSummary = style({ margin: 0, fontSize: 14, lineHeight: 1.7, fontWeight: 500, color: HEADING });

export const issueList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

export const issueNum = style({ fontSize: 11, fontWeight: 700, color: PRIMARY, fontVariantNumeric: "tabular-nums" });

export const issueTitle = style({ fontSize: 13, fontWeight: 700, color: HEADING, lineHeight: 1.45 });

export const issueBasis = style({ fontSize: 11.5, color: MUTED, lineHeight: 1.5 });

export const checkList = style({ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 });

export const checkItem = style({ fontSize: 13, lineHeight: 1.6, color: BODY });

export const aiDisclaimer = style({ margin: 0, fontSize: 11.5, color: FAINT });

/* ── 기일 줄(상세·목록 공통) ── */

export const hearingList = style({ display: "flex", flexDirection: "column" });

export const hearingRow = style({
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none", paddingBottom: 0 },
  },
});

export const hearingMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 });

export const hearingTitle = style({ fontSize: 13.5, fontWeight: 700, color: HEADING });

export const hearingActions = style({ display: "flex", gap: 8, flexShrink: 0 });

/* 날짜 상자 — 왼쪽에 날짜를 크게 세운다. */
export const dateBox = style({
  minWidth: 78,
  padding: "9px 10px",
  borderRadius: themeVars.radius.md,
  background: SURFACE_ALT,
  border: `1px solid ${BORDER}`,
  textAlign: "center",
  flexShrink: 0,
});

export const dateBoxDay = style({
  display: "block",
  fontSize: 21,
  fontWeight: 800,
  color: HEADING,
  lineHeight: 1.15,
  fontVariantNumeric: "tabular-nums",
});

export const dateBoxSub = style({ display: "block", fontSize: 11, fontWeight: 700, color: MUTED });

export const dateBoxEmpty = style({ fontSize: 11.5, fontWeight: 600, color: FAINT });

/* ── 서면·증거 줄 ── */

export const docRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none", paddingBottom: 0 },
  },
});

export const docIcon = style({ width: 16, height: 16, color: MUTED, flexShrink: 0 });

export const docName = style({ fontSize: 12.5, fontWeight: 600, color: HEADING });

export const docMeta = style({ marginLeft: "auto", fontSize: 11.5, color: FAINT, flexShrink: 0 });

/* ── 심급 진행(1심 → 2심 → 3심) ── */

export const stageRow = style({ display: "flex", alignItems: "center", gap: 6 });

export const stageStep = style({
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 700,
  border: `1px solid ${BORDER}`,
  color: FAINT,
  background: SURFACE,
});

export const stageStepActive = style({ borderColor: PRIMARY, background: PRIMARY_SOFT, color: PRIMARY_DARK });

export const stageStepDone = style({ borderColor: "transparent", background: SURFACE_ALT, color: BODY });

export const stageArrow = style({ fontSize: 11, color: FAINT });

/* ── 달력(lawkit 에 월 달력이 없어 격자만 직접 만든다) ── */

export const calendarHeadNav = style({ display: "flex", alignItems: "center", gap: 8 });

export const calendarMonth = style({ fontSize: 14, fontWeight: 700, color: HEADING, fontVariantNumeric: "tabular-nums" });

export const calendarLegend = style({ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 });

export const calendarGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  borderTop: `1px solid ${BORDER}`,
  borderLeft: `1px solid ${BORDER}`,
});

export const weekdayCell = style({
  padding: "8px 10px",
  borderRight: `1px solid ${BORDER}`,
  borderBottom: `1px solid ${BORDER}`,
  background: SURFACE_ALT,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".03em",
  color: MUTED,
  textAlign: "center",
});

export const dayCell = style({
  minHeight: 104,
  padding: 8,
  borderRight: `1px solid ${BORDER}`,
  borderBottom: `1px solid ${BORDER}`,
  background: SURFACE,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const dayCellMuted = style({ background: SURFACE_ALT });

export const dayNumber = style({ fontSize: 11.5, fontWeight: 700, color: BODY });

export const dayNumberVariant = styleVariants({
  today: {
    alignSelf: "flex-start",
    minWidth: 20,
    padding: "1px 6px",
    borderRadius: 999,
    background: PRIMARY,
    color: c.textInverse,
    textAlign: "center",
  },
  sunday: { color: c.accentDanger },
  saturday: { color: c.accentInfo },
  muted: { color: FAINT },
});

/* 달력 칸 안 일정 알약 — 종류별로 색이 다르다. */
export const eventPill = style({
  display: "block",
  width: "100%",
  padding: "3px 6px",
  borderRadius: themeVars.radius.sm,
  border: "none",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.35,
  textAlign: "left",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const eventTone = styleVariants({
  hearing: { background: PRIMARY_SOFT, color: PRIMARY_DARK },
  verdict: { background: SUCCESS_TINT, color: c.accentSuccessActive },
  deadline: { background: WARNING_TINT, color: WARNING_DARK },
});

/* 범례·목록용 알약 — 글자 길이만큼만 차지한다. */
export const eventTag = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: themeVars.radius.sm,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.45,
  whiteSpace: "nowrap",
});

/* ── 우측 레일 보조 ── */

export const railActions = style({ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 });

export const railFacts = style({ display: "flex", flexDirection: "column", gap: 14 });

/* 카드형 목록의 facts — 카드가 넓어 3열이 너무 벌어지지 않게 폭을 잡는다. */
export const boardFacts = style({ gridTemplateColumns: "repeat(3, minmax(0, 240px))", gap: "14px 32px" });
