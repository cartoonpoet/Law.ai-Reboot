import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const border = themeVars.color.neutralBorder;
const accent = themeVars.color.accentPrimary;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;

/* 알림 한 건 — AI 비서의 홈 알림 카드·알림 화면 공용 */
export const item = style({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  width: "100%",
  padding: "11px 16px",
  textAlign: "left",
  font: "inherit",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid color-mix(in srgb, ${border} 50%, transparent)`,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: `color-mix(in srgb, ${heading} 5%, transparent)` },
    "&:last-child": { borderBottom: "none" },
  },
});

/* 안 읽은 항목 — 옅은 배경 */
export const itemUnread = style({
  background: `color-mix(in srgb, ${accent} 7%, transparent)`,
  selectors: { "&:hover": { background: `color-mix(in srgb, ${accent} 12%, transparent)` } },
});

export const itemTop = style({ display: "flex", alignItems: "center", gap: 6 });

export const actorName = style({ fontSize: 12.5, fontWeight: 700, color: heading });

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

export const time = style({ fontSize: 11, color: muted });
