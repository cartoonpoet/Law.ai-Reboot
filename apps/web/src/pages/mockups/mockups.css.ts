import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

// 시안 페이지 — ContractDetailPage 스타일과 시각 정합성 우선.
// (실제 contractDetail.css 에서 차용한 토큰 패턴 그대로 사용)

const SURFACE = themeVars.color.neutralSurface;
const BACKGROUND = themeVars.color.neutralBackground;
const BORDER = themeVars.color.neutralBorder;
const HEADING = themeVars.color.textHeading;
const BODY = themeVars.color.textSecondary;
const MUTED = themeVars.color.textMuted;
const PRIMARY = themeVars.color.accentPrimary;

// === 인덱스 ===
export const indexWrap = style({
  maxWidth: 880,
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const indexHero = style({
  fontSize: 22,
  fontWeight: 700,
  color: HEADING,
});

export const indexSub = style({
  color: MUTED,
  fontSize: 13,
});

export const indexCard = style({
  display: "block",
  padding: 18,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: SURFACE,
  textDecoration: "none",
  color: BODY,
  selectors: {
    "&:hover": {
      borderColor: PRIMARY,
      background: BACKGROUND,
    },
  },
});

globalStyle(`.${indexCard} h3`, {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: HEADING,
});

globalStyle(`.${indexCard} p`, {
  margin: "6px 0 0",
  fontSize: 13,
  color: themeVars.color.textSecondary,
  lineHeight: 1.5,
});

// === 미리보기 본문(모달/드로어/페이지 공용) ===
export const previewArea = style({
  background: "#f4f5f7",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 520,
  overflow: "auto",
});

export const previewPage = style({
  width: "80%",
  maxWidth: 580,
  background: "#fff",
  boxShadow: "0 1px 6px rgba(0,0,0,.08)",
  padding: 36,
  fontSize: 12.5,
  color: BODY,
  lineHeight: 1.7,
});

export const previewToolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  marginTop: 8,
  borderTop: `1px solid ${BORDER}`,
  fontSize: 12,
  color: MUTED,
});

// === 좌우 비교 ===
export const compareSplit = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  background: "#f4f5f7",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  minHeight: 520,
  overflow: "hidden",
});

export const compareCol = style({
  background: "#fff",
  padding: 20,
  fontSize: 12.5,
  lineHeight: 1.7,
  color: BODY,
  overflow: "auto",
  borderRight: `1px solid ${BORDER}`,
  selectors: { "&:last-child": { borderRight: 0 } },
});

export const compareColLabel = style({
  fontSize: 11,
  fontWeight: 700,
  color: HEADING,
  marginBottom: 10,
  paddingBottom: 6,
  borderBottom: `1px solid ${BORDER}`,
  textTransform: "uppercase",
  letterSpacing: 0.4,
});

export const diffAdd = style({
  background: "#dcfce7",
  display: "block",
  padding: "2px 8px",
  borderLeft: "3px solid #16a34a",
  margin: "2px 0",
});

export const diffRemove = style({
  background: "#fee2e2",
  display: "block",
  padding: "2px 8px",
  borderLeft: "3px solid #dc2626",
  margin: "2px 0",
});

export const diffContext = style({
  display: "block",
  padding: "2px 8px",
});

export const sectionHeading = style({
  fontWeight: 700,
  marginTop: 14,
  marginBottom: 4,
  fontSize: 13,
  color: HEADING,
});

// === 드로어 (B) ===
export const drawerWrap = style({
  position: "fixed",
  top: 0,
  right: 0,
  height: "100vh",
  width: "60%",
  maxWidth: 880,
  background: SURFACE,
  borderLeft: `1px solid ${BORDER}`,
  boxShadow: "-8px 0 28px rgba(0,0,0,.1)",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
});

export const drawerHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: 13,
});

export const drawerHeaderTitle = style({
  fontWeight: 700,
  color: HEADING,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const drawerHeaderActions = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const drawerBody = style({
  flex: 1,
  padding: 16,
  overflow: "auto",
});

// === 전용 페이지 (C) ===
export const fullPageHeader = style({
  padding: "14px 16px",
  borderBottom: `1px solid ${BORDER}`,
  background: SURFACE,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: "8px 8px 0 0",
});

export const fullPageTitle = style({
  fontSize: 15,
  fontWeight: 700,
  color: HEADING,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const fullPageActions = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const fullPageShell = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  overflow: "hidden",
});

export const fullPageBody = style({
  padding: 16,
  background: BACKGROUND,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

// === backdrop note (어떤 시안인지 안내) ===
export const variantBadge = style({
  position: "fixed",
  bottom: 16,
  right: 16,
  background: HEADING,
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,.2)",
});

globalStyle(`.${variantBadge} a`, {
  color: "#fff",
  textDecoration: "underline",
});

// === 체크박스 선택 가능한 docFileRow 오버라이드 ===
export const docFileRowSelect = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const fileKindHint = style({
  opacity: 0.6,
  marginLeft: 4,
});

// 비교 헤더(B1/B2 공용) — A 파일 | swap | B 파일 dropdown 한 줄.
export const compareHeader = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: HEADING,
  flex: 1,
  minWidth: 0,
});

export const compareHeaderLabel = style({
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 220,
});

export const compareHeaderSwap = style({
  fontSize: 14,
  color: MUTED,
  padding: "0 4px",
});

export const compareHeaderPicker = style({
  minWidth: 220,
});

// 빈 비교 상태(B2 미리보기일 때 dropdown 한 줄만)
export const compareHint = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  background: BACKGROUND,
  border: `1px dashed ${BORDER}`,
  borderRadius: 6,
  marginBottom: 12,
  fontSize: 12,
  color: MUTED,
});

// B3 quickpick — 행의 "비교" 버튼 옆에 떠있는 미니 메뉴
export const quickpickMenu = style({
  position: "absolute",
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
  padding: 6,
  minWidth: 260,
  zIndex: 80,
});

export const quickpickHeader = style({
  fontSize: 11,
  color: MUTED,
  fontWeight: 600,
  padding: "6px 10px",
  textTransform: "uppercase",
  letterSpacing: 0.4,
});

export const quickpickItem = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 10px",
  cursor: "pointer",
  borderRadius: 4,
  selectors: {
    "&:hover": {
      background: BACKGROUND,
    },
  },
});

export const quickpickItemName = style({
  fontSize: 13,
  color: HEADING,
  fontWeight: 500,
});

export const quickpickItemMeta = style({
  fontSize: 11,
  color: MUTED,
});

export const quickpickAnchor = style({
  position: "relative",
});

// 모달 안 비교 헤더(B1/B2 좌우 분할 안)
export const compareDocLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: BACKGROUND,
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 12,
  color: HEADING,
  whiteSpace: "nowrap",
});
