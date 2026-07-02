import { style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

const HOVER = "rgba(255,255,255,.04)";

/* === 셸 레이아웃 (admin 콘솔 스타일 — 섹션 그룹핑) === */
export const aside = style({
  width: 232,
  flexShrink: 0,
  background: T.navy,
  borderRight: `1px solid ${T.navyLine}`,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  position: "sticky",
  top: 0,
});

export const brand = style({
  padding: "18px 16px 14px",
  borderBottom: `1px solid ${T.navyLine}`,
  display: "flex",
  alignItems: "center",
  gap: 9,
});

export const brandText = style({
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "#fff",
});

export const brandTextDim = style({ opacity: 0.45 });

export const nav = style({
  flex: 1,
  overflowY: "auto",
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 1,
});

/* 섹션 헤더 — admin 콘솔의 그룹 라벨(uppercase, 작은 회색) */
export const sectionLabel = style({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: T.navyFaint,
  padding: "14px 10px 6px",
});

/* 첫 섹션은 위 여백 줄임(브랜드 바로 아래) */
export const sectionLabelFirst = style({ paddingTop: 6 });

/* 하단 사용자 프로필 */
export const foot = style({
  padding: "12px 14px",
  borderTop: `1px solid ${T.navyLine}`,
  display: "flex",
  alignItems: "center",
  gap: 9,
});

export const footAvatar = style({
  width: 30,
  height: 30,
  borderRadius: 7,
  background: T.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
});

export const footMain = style({ flex: 1, minWidth: 0 });
export const footName = style({ fontSize: 12.5, fontWeight: 700, color: T.navyText });
export const footRole = style({ fontSize: 11, color: T.navyMuted, marginTop: 1 });
export const footLogout = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
});
export const footLogoutIcon = style({ width: 15, height: 15, color: T.navyFaint });

/* 메뉴 행 — 레이아웃/공통은 row, 색·상태는 상태 클래스가 담당(겹침 방지) */
export const row = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  cursor: "pointer",
  borderRadius: 6,
  background: "transparent",
  fontFamily: "Pretendard",
  fontSize: 13,
  textAlign: "left",
  transition: "background-color .15s ease, color .15s ease, box-shadow .15s ease",
});

/* 기본 */
export const rowDefault = style({
  color: T.navyMuted,
  fontWeight: 500,
  selectors: { "&:hover": { background: HOVER, color: T.navyText } },
});
/* 현재 위치한 단일 메뉴(리프) — 강조 채움 */
export const rowLocated = style({ background: T.primary, color: "#fff", fontWeight: 700 });

export const icon = style({ width: 16, height: 16, flexShrink: 0, opacity: 0.85 });
export const label = style({ flex: 1 });
