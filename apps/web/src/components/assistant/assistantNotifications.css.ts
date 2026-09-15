import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { AI_TEXT } from "../ui/aiTone";

const c = themeVars.color;

const resetButton = style({ border: "none", background: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" });

const countBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: c.accentDanger,
  color: c.textInverse,
  fontWeight: 700,
} as const;

/* 하단 탭의 알림 개수 */
export const navBadge = style({
  ...countBadge,
  position: "absolute",
  top: 4,
  left: "calc(50% + 6px)",
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  fontSize: 10,
});

/* 홈 알림 카드 */
export const cardHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });

export const countPill = style({ ...countBadge, minWidth: 18, height: 18, padding: "0 6px", marginLeft: 6, fontSize: 11 });

export const linkButton = style([resetButton, { fontSize: 12, fontWeight: 600, color: AI_TEXT }]);

// 카드 안쪽 여백을 무시하고 알림 줄이 카드 폭을 꽉 채우게 한다.
export const noticeList = style({
  display: "flex",
  flexDirection: "column",
  margin: "0 -16px -16px",
  borderTop: `1px solid ${c.neutralBorder}`,
  borderRadius: "0 0 14px 14px",
  overflow: "hidden",
});

/* 알림 화면 */
export const headerTitle = style({ flex: 1, margin: 0, paddingLeft: 8, fontSize: 15, fontWeight: 800, color: c.textHeading });

export const markAllButton = style([
  resetButton,
  {
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: AI_TEXT,
    selectors: { "&:disabled": { color: c.textMuted, cursor: "default" } },
  },
]);

export const filterRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: "10px 16px",
  background: c.neutralSurface,
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const filterChip = style([
  resetButton,
  {
    padding: "4px 12px",
    borderRadius: 999,
    border: `1px solid ${c.neutralBorder}`,
    fontSize: 12,
    color: c.textMuted,
  },
]);

export const filterChipActive = style({ background: c.textHeading, borderColor: c.textHeading, color: c.textInverse });

export const list = style({ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: c.neutralSurface });

export const emptyText = style({ margin: 0, padding: "40px 16px", textAlign: "center", fontSize: 13, color: c.textMuted });
