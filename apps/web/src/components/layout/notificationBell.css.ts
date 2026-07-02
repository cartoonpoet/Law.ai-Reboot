import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;
const accent = themeVars.color.accentPrimary;
const danger = themeVars.color.accentDanger;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;

/* 벨 영역 컨테이너(버튼 + 드롭다운 앵커) */
export const root = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

/* 벨 버튼(기존 TopBar 인라인 대체) */
export const bellButton = style({
  position: "relative",
  width: 34,
  height: 34,
  borderRadius: 7,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: muted,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${heading} 8%, transparent)`,
    },
  },
});

/* 안읽음 카운트 배지 */
export const unreadBadge = style({
  position: "absolute",
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 999,
  background: danger,
  color: themeVars.color.textInverse,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: "16px",
  textAlign: "center",
  border: `1.5px solid ${surface}`,
  boxSizing: "content-box",
});

/* 드롭다운 외부 클릭 닫기용 backdrop(투명, 전체 화면) */
export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 30,
  background: "transparent",
  border: "none",
  cursor: "default",
});

/* 드롭다운 패널 */
export const panel = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  zIndex: 31,
  width: 320,
  maxHeight: 420,
  display: "flex",
  flexDirection: "column",
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 12,
  boxShadow: themeVars.shadow.modal,
  overflow: "hidden",
});

/* 패널 헤더(타이틀 + 모두 읽음) */
export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: `1px solid ${border}`,
});

export const panelTitle = style({
  fontSize: 13,
  fontWeight: 700,
  color: heading,
});

export const markAllButton = style({
  fontSize: 12,
  fontWeight: 600,
  color: accent,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 6,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${accent} 10%, transparent)`,
    },
    "&:disabled": {
      color: muted,
      cursor: "default",
      background: "transparent",
    },
  },
});

/* 항목 목록 스크롤 영역 */
export const list = style({
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
});

/* 알림 항목 */
export const item = style({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "11px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid color-mix(in srgb, ${border} 50%, transparent)`,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${heading} 5%, transparent)`,
    },
    "&:last-child": {
      borderBottom: "none",
    },
  },
});

/* 안읽음 항목 강조(좌측 보더 + 옅은 배경) */
export const itemUnread = style({
  background: `color-mix(in srgb, ${accent} 7%, transparent)`,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${accent} 12%, transparent)`,
    },
  },
});

export const itemTop = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const actorName = style({
  fontSize: 12.5,
  fontWeight: 700,
  color: heading,
});

/* 안읽음 점 표시 */
export const unreadDot = style({
  width: 6,
  height: 6,
  borderRadius: 999,
  background: accent,
  flexShrink: 0,
  marginLeft: "auto",
});

export const preview = style({
  fontSize: 12.5,
  lineHeight: 1.5,
  color: themeVars.color.textSecondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
});

export const time = style({
  fontSize: 11,
  color: muted,
});

/* 빈 상태 */
export const empty = style({
  padding: "28px 14px",
  textAlign: "center",
  fontSize: 12.5,
  color: muted,
});
