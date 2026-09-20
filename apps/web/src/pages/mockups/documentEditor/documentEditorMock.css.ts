import { style, globalStyle, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 표준양식 관리 · 문서 편집기 시안 전용 스타일.
 * 목록/카드/페이지 머리는 계약·자문 화면 것을 그대로 쓰고, 여기에는
 * 문서 편집기(종이 캔버스·로아이 패널·버전 이력)에만 필요한 것을 둔다.
 * 색·간격은 themeVars + color-mix 파생만 사용(로컬 hex 0).
 * ======================================================================= */

const c = themeVars.color;

const HEADING = c.textHeading;
const BODY = c.textSecondary;
const MUTED = c.textMuted;
const SURFACE = c.neutralSurface;
const SURFACE_ALT = c.neutralSurfaceAlt;
const BACKGROUND = c.neutralBackground;
const BORDER = c.neutralBorder;
const PRIMARY = c.accentPrimary;
const PRIMARY_SOFT = `color-mix(in srgb, ${PRIMARY} 9%, ${SURFACE})`;
const PRIMARY_LINE = `color-mix(in srgb, ${PRIMARY} 26%, ${SURFACE})`;
const DANGER_SOFT = `color-mix(in srgb, ${c.accentDanger} 10%, ${SURFACE})`;
const WARNING_SOFT = `color-mix(in srgb, ${c.accentWarning} 14%, ${SURFACE})`;
const INFO_SOFT = `color-mix(in srgb, ${c.accentInfo} 10%, ${SURFACE})`;

/* ── 시안 안내 · 필터 ── */

export const mockNote = style({ marginBottom: 16 });

export const filters = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" });

export const filterSelect = style({ width: 170 });

export const search = style({ flex: 1, minWidth: 220, maxWidth: 340 });

export const searchIcon = style({ width: 15, height: 15, color: c.textDisabled });

export const pager = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px 14px",
});

/* ── 목록 표 셀(계약 조회와 같은 글자 크기·색) ── */

export const cellStack = style({ display: "flex", flexDirection: "column", gap: 2 });

export const cellRow = style({ display: "inline-flex", alignItems: "center", gap: 6 });

export const tplName = style({
  fontSize: 13,
  fontWeight: 600,
  color: PRIMARY,
  letterSpacing: "-0.01em",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const meta = style({ fontSize: 11.5, color: MUTED });

export const metaStrong = style({ fontSize: 12.5, color: BODY, fontWeight: 600 });

export const dateText = style({ fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" });

export const verChip = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 7px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  color: PRIMARY,
  background: PRIMARY_SOFT,
  border: `1px solid ${PRIMARY_LINE}`,
});

export const rowActions = style({ display: "flex", gap: 6, justifyContent: "flex-end" });

/* ── 사이드바 메뉴 자리 시안 ── */

export const navPreview = style({
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
  padding: 14,
  marginBottom: 16,
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
});

export const navPreviewBox = style({
  width: 212,
  flexShrink: 0,
  padding: 8,
  borderRadius: 8,
  background: c.accentDark,
});

export const navPreviewLabel = style({
  padding: "6px 10px 8px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: `color-mix(in srgb, ${c.textInverse} 60%, transparent)`,
});

export const navPreviewItem = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 500,
  color: `color-mix(in srgb, ${c.textInverse} 78%, transparent)`,
});

export const navPreviewItemNew = style({
  background: PRIMARY,
  color: c.textInverse,
  fontWeight: 700,
});

export const navPreviewIcon = style({ width: 15, height: 15, flexShrink: 0 });

export const navPreviewNew = style({
  marginLeft: "auto",
  fontSize: 10,
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: 999,
  background: c.textInverse,
  color: PRIMARY,
});

export const navPreviewText = style({ flex: 1, minWidth: 0, fontSize: 12.5, color: BODY, lineHeight: 1.65 });

export const navPreviewTitle = style({ fontSize: 13, fontWeight: 700, color: HEADING, marginBottom: 6 });

/* ── 편집기 화면 뼈대 ── */

export const editorHead = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
});

export const editorTitleGroup = style({ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 });

export const editorTitleRow = style({ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" });

export const editorTitle = style({
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: HEADING,
});

export const editorSub = style({ fontSize: 12, color: MUTED });

export const editorActions = style({ display: "flex", gap: 8, flexShrink: 0 });

/** 실제 편집기 화면의 로딩/오류 상태(Skeleton·EmptyState) 감싸는 여백. */
export const pageStatus = style({ padding: "16px 0 8px" });

/** 편집기 + 로아이 패널 2단. 패널이 닫히면 한 단. */
export const editorLayout = styleVariants({
  solo: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, alignItems: "start" },
  withPanel: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 376px", gap: 14, alignItems: "start" },
});

/* ── 종이처럼 보이는 캔버스 ── */

/** RichTextEditor 바깥 상자 덮어쓰기 — 회색 바탕 위에 종이를 올린다. */
export const docShell = style({ background: BACKGROUND, position: "relative" });

/** 편집 영역(.ProseMirror) — A4 비율 흰 종이. */
export const docPage = style({});

globalStyle(`${docShell} ${docPage}`, {
  position: "relative",
  width: "100%",
  maxWidth: 748,
  minHeight: 900,
  margin: "26px auto",
  padding: "62px 66px",
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  boxShadow: "0 3px 14px color-mix(in srgb, #000 12%, transparent)",
  fontSize: 14,
  lineHeight: 1.85,
  color: c.textPrimary,
  counterReset: "pageBreak 1",
});

/* 종이 첫 쪽 표시 — 위쪽 여백에 얹는 "1페이지" 배지. 이후 쪽은 페이지 나누기 배지가 대신한다. */
globalStyle(`${docShell} ${docPage}::before`, {
  content: '"1페이지"',
  position: "absolute",
  top: 16,
  right: 20,
  padding: "2px 10px",
  borderRadius: 999,
  background: BACKGROUND,
  border: `1px solid ${BORDER}`,
  color: MUTED,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "-0.01em",
});

/* 종이 안 계약서 서식 — 가운데 제목, 조항 제목은 왼쪽 굵게. */
globalStyle(`${docPage} h1`, { fontSize: 22, textAlign: "center", margin: "0 0 26px", letterSpacing: "-0.02em" });
globalStyle(`${docPage} h2`, { fontSize: 14.5, margin: "22px 0 6px" });
globalStyle(`${docPage} p`, { margin: "0 0 12px", textAlign: "justify" });
globalStyle(`${docPage} table`, { fontSize: 13 });

/*
 * 페이지 나누기 블록(문서 편집기 캔버스 전용 강화 스타일) — 실제 워드처럼 종이와 종이 사이가
 * 회색 틈으로 끊어지고, 그 틈 가운데 다음 쪽 번호 배지가 뜬다. 종이 좌우 패딩 밖까지 번지도록
 * 음수 마진을 줘서 종이 폭 전체가 끊어진 것처럼 보이게 한다.
 * (다른 화면의 RichTextEditor — 계약/자문 본문 — 는 RichTextEditor.css.ts 의 얇은 점선 스타일 그대로 쓴다.)
 */
globalStyle(`${docShell} ${docPage} div[data-page-break]`, {
  position: "relative",
  counterIncrement: "pageBreak",
  height: 40,
  margin: "40px -66px",
  background: BACKGROUND,
  borderTop: `1px solid ${BORDER}`,
  borderBottom: `1px solid ${BORDER}`,
  boxShadow:
    "inset 0 8px 10px -10px color-mix(in srgb, #000 22%, transparent), inset 0 -8px 10px -10px color-mix(in srgb, #000 22%, transparent)",
});
globalStyle(`${docShell} ${docPage} div[data-page-break]::after`, {
  content: 'counter(pageBreak) "페이지"',
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  padding: "2px 10px",
  borderRadius: 999,
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: MUTED,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
});
globalStyle(`${docShell} ${docPage} div[data-page-break].ProseMirror-selectednode::after`, {
  color: PRIMARY,
  borderColor: PRIMARY_LINE,
});

export const docFoot = style({ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 });

export const docFootText = style({ fontSize: 11, fontWeight: 600, color: MUTED });

export const docFootSaved = style({ fontSize: 11, fontWeight: 700, color: c.accentSuccess });

/* ── 글을 선택했을 때 뜨는 작은 툴바 ── */

/* 화면에 고정된 작은 툴바 — 종이 어디를 고르든 늘 같은 자리에 떠서 눈에 띈다. */
export const bubble = style({
  position: "fixed",
  bottom: 26,
  left: "calc(50% + 80px)",
  transform: "translateX(-50%)",
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 8px",
  borderRadius: 999,
  background: c.accentDark,
  boxShadow: themeVars.shadow.modal,
});

export const bubbleLabel = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  paddingRight: 4,
  fontSize: 11.5,
  fontWeight: 700,
  color: c.textInverse,
  whiteSpace: "nowrap",
});

export const bubbleIcon = style({ width: 14, height: 14 });

/* ── 로아이 패널 ── */

export const panel = style({
  position: "sticky",
  top: 12,
  display: "flex",
  flexDirection: "column",
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
});

export const panelHead = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "11px 13px",
  borderBottom: `1px solid ${BORDER}`,
  background: PRIMARY_SOFT,
  fontSize: 13.5,
  fontWeight: 700,
  color: HEADING,
});

export const panelHeadIcon = style({ width: 15, height: 15, color: PRIMARY });

export const panelHeadSpacer = style({ flex: 1 });

export const panelTabs = style({ display: "flex", flexDirection: "column", gap: 7, padding: "10px 12px 2px" });

/** 세 칸이 패널 너비를 꽉 채우게 — 이름이 잘리지 않는다. */
export const panelTabGroup = style({ display: "flex", width: "100%" });

globalStyle(`${panelTabGroup} > button`, { flex: 1, minWidth: 0, whiteSpace: "nowrap" });

/** 고른 칸이 무슨 일을 하는지 한 줄 안내. */
export const panelTabHint = style({ fontSize: 11, color: MUTED, lineHeight: 1.5 });

export const panelBody = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 13,
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
});

export const panelLead = style({ fontSize: 12, color: BODY, lineHeight: 1.65 });

/** 고른 문장이 없을 때 안내가 패널 가운데에 자리 잡게. */
export const panelEmpty = style({ padding: "22px 4px" });

export const panelLabel = style({
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.03em",
  color: MUTED,
});

export const presetList = style({ display: "flex", flexDirection: "column", gap: 6 });

export const presetItem = style({
  padding: "8px 10px",
  borderRadius: 7,
  border: `1px dashed ${BORDER}`,
  background: SURFACE_ALT,
  fontSize: 12,
  color: BODY,
  cursor: "pointer",
  selectors: { "&:hover": { borderColor: PRIMARY, background: PRIMARY_SOFT, color: PRIMARY } },
});

export const quote = style({
  padding: "9px 11px",
  borderLeft: `3px solid ${PRIMARY_LINE}`,
  borderRadius: "0 6px 6px 0",
  background: SURFACE_ALT,
  fontSize: 12,
  lineHeight: 1.7,
  color: BODY,
});

export const rewriteGrid = style({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 });

export const rewriteItem = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 9px",
  borderRadius: 7,
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  cursor: "pointer",
  selectors: { "&:hover": { borderColor: PRIMARY, background: PRIMARY_SOFT } },
});

export const rewriteItemOn = style({ borderColor: PRIMARY, background: PRIMARY_SOFT });

export const rewriteLabel = style({ fontSize: 12, fontWeight: 700, color: HEADING });

export const rewriteHint = style({ fontSize: 10.5, color: MUTED, lineHeight: 1.5 });

export const resultBox = style({
  padding: "10px 11px",
  borderRadius: 8,
  border: `1px solid ${PRIMARY_LINE}`,
  background: PRIMARY_SOFT,
  fontSize: 12,
  lineHeight: 1.75,
  color: c.textPrimary,
});

export const resultActions = style({ display: "flex", gap: 6, marginTop: 9 });

/* 초안 검토 결과 */

export const findingSummary = style({ display: "flex", gap: 6, flexWrap: "wrap" });

export const findingList = style({ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none" });

// 위 요약 줄의 색깔 배지가 이미 "위험/빈칸/누락"을 말해 준다 — 낱개 카드까지 막대·배경색으로
// 다시 칠하지 않는다. 카드는 전부 같은 중립 테두리, 심각도는 findingKind 알약 하나에만 담는다.
export const findingItem = styleVariants({
  danger: { color: c.accentDanger, background: DANGER_SOFT, borderColor: `color-mix(in srgb, ${c.accentDanger} 35%, ${BORDER})` },
  warning: { color: c.accentWarningActive, background: WARNING_SOFT, borderColor: `color-mix(in srgb, ${c.accentWarning} 35%, ${BORDER})` },
  info: { color: c.accentInfo, background: INFO_SOFT, borderColor: `color-mix(in srgb, ${c.accentInfo} 35%, ${BORDER})` },
});

export const findingBox = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "9px 11px",
  border: `1px solid ${BORDER}`,
  borderRadius: themeVars.radius.md,
});

export const findingTop = style({ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" });

export const findingKind = style({
  fontSize: 10,
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: 999,
  border: "1px solid currentColor",
});

export const findingWhere = style({ fontSize: 10.5, color: MUTED, fontWeight: 600 });

export const findingTitle = style({ fontSize: 12.5, fontWeight: 700, color: HEADING, lineHeight: 1.5 });

export const findingNote = style({ fontSize: 11.5, color: BODY, lineHeight: 1.65 });

export const disclaimer = style({
  paddingTop: 9,
  borderTop: `1px dashed ${BORDER}`,
  fontSize: 10.5,
  color: MUTED,
  lineHeight: 1.6,
});

/* ── 버전 이력 모달 ── */

export const verList = style({ display: "flex", flexDirection: "column", gap: 8 });

export const verRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 14px",
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  background: SURFACE,
});

export const verRowNow = style({ borderColor: PRIMARY_LINE, background: PRIMARY_SOFT });

export const verNo = style({
  flexShrink: 0,
  width: 46,
  fontSize: 15,
  fontWeight: 700,
  color: HEADING,
  fontVariantNumeric: "tabular-nums",
});

export const verMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 });

export const verMeta = style({ fontSize: 11.5, color: MUTED });

export const verNote = style({ fontSize: 12.5, color: BODY, lineHeight: 1.6 });

export const verAction = style({ flexShrink: 0, alignSelf: "center" });

export const modalHint = style({ marginBottom: 12 });

/* ── 양식 고르기 모달(계약 작성에서 여는 것) ── */

export const startFoot = style({ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 });

export const startFootInfo = style({ fontSize: 12.5, fontWeight: 500, color: BODY });

export const startFootStrong = style({ fontWeight: 700, color: PRIMARY });

export const startFootBtns = style({ display: "flex", gap: 8 });

export const startHint = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 10,
  fontSize: 11.5,
  color: MUTED,
  lineHeight: 1.6,
});

export const openerCard = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 18,
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  boxShadow: themeVars.shadow.raised,
  maxWidth: 620,
});

export const openerTitle = style({ fontSize: 14.5, fontWeight: 700, color: HEADING });

export const openerText = style({ fontSize: 12.5, color: BODY, lineHeight: 1.7 });

export const openerRow = style({ display: "flex", gap: 8, flexWrap: "wrap" });
