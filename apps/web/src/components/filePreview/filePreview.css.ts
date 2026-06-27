import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const SURFACE = themeVars.color.neutralSurface;
const BACKGROUND = themeVars.color.neutralBackground;
const BORDER = themeVars.color.neutralBorder;
const HEADING = themeVars.color.textHeading;
const MUTED = themeVars.color.textMuted;

// 모달 본문 — 단일 미리보기 / 좌우 분할 공용 컨테이너.
export const stage = style({
  background: "#f4f5f7",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  minHeight: 540,
  display: "flex",
  flexDirection: "column",
});

// 단일 미리보기(스크롤 + 가운데 정렬).
export const single = style({
  flex: 1,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  overflow: "auto",
  padding: 16,
});

// 좌우 비교(grid 2열). 각 컬럼은 독립 스크롤.
export const split = style({
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  overflow: "hidden",
});

export const splitCol = style({
  background: "#fff",
  borderRight: `1px solid ${BORDER}`,
  overflow: "auto",
  selectors: { "&:last-child": { borderRight: 0 } },
});

export const splitColLabel = style({
  position: "sticky",
  top: 0,
  background: SURFACE,
  borderBottom: `1px solid ${BORDER}`,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: HEADING,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  zIndex: 1,
});

export const splitColBody = style({
  padding: 12,
});

// 하단 툴바(페이지 네비 · 줌 · 동기 스크롤 등).
export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  marginTop: 8,
  borderTop: `1px solid ${BORDER}`,
  fontSize: 12,
  color: MUTED,
});

// 모달 헤더의 A ↔ Dropdown 한 줄 레이아웃.
export const header = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: HEADING,
  flex: 1,
  minWidth: 0,
});

export const headerLabel = style({
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 320,
});

export const headerSwap = style({
  fontSize: 14,
  color: MUTED,
  padding: "0 4px",
});

export const headerPicker = style({
  minWidth: 240,
});

// 렌더러 공용 — 로딩/에러/미지원 placeholder.
export const placeholder = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: 32,
  color: MUTED,
  fontSize: 13,
  textAlign: "center",
});

export const placeholderTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: HEADING,
});

// PDF / DOCX 렌더 출력의 보호 컨테이너 — 외부 페이지 그림자.
export const docPage = style({
  background: "#fff",
  boxShadow: "0 1px 4px rgba(0,0,0,.08)",
  margin: "0 auto",
  maxWidth: "100%",
});

// DOCX inline HTML — DOMPurify 통과 후 globalStyle 로 기본 폰트/여백.
export const docxBody = style({
  background: "#fff",
  padding: 24,
  color: HEADING,
  fontSize: 13,
  lineHeight: 1.7,
});

globalStyle(`.${docxBody} p`, { margin: "0 0 8px" });
globalStyle(`.${docxBody} h1, .${docxBody} h2, .${docxBody} h3`, {
  margin: "12px 0 6px",
  fontWeight: 700,
});
globalStyle(`.${docxBody} table`, {
  borderCollapse: "collapse",
  margin: "8px 0",
});
globalStyle(`.${docxBody} td, .${docxBody} th`, {
  border: `1px solid ${BORDER}`,
  padding: "4px 8px",
});
globalStyle(`.${docxBody} ul, .${docxBody} ol`, {
  margin: "0 0 8px",
  paddingLeft: 20,
});

// PDF 페이지 네비 — react-pdf 기본은 단일 페이지라 직접 컨트롤.
export const pdfNav = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginLeft: "auto",
});

// 이미지 렌더 — object-fit contain 으로 큰 이미지도 모달 안에서 보이게.
export const image = style({
  display: "block",
  maxWidth: "100%",
  maxHeight: "70vh",
  margin: "0 auto",
});

export { BACKGROUND };
