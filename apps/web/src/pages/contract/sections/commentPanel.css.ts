import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/**
 * 검토 의견 패널 스타일 — 시안(comment-section-mockup.html) `.thread`/`.emptystate`/`.divider` 룩 매핑.
 */

const accent = themeVars.color.accentPrimary;
const border = themeVars.color.neutralBorder;
const surface = themeVars.color.neutralSurface;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;

/* 스레드 — 시안 `.thread` gap:18. */
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

/* 한 행 — `.cmt`. */
export const row = style({
  display: "flex",
  gap: 12,
});

export const main = style({
  flex: 1,
  minWidth: 0,
});

/* 헤더 — `.cmthd`. */
export const head = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginBottom: 5,
  flexWrap: "wrap",
});

export const author = style({
  fontSize: 13,
  fontWeight: 700,
  color: heading,
});

export const time = style({
  fontSize: 11.5,
  color: themeVars.color.textDisabled,
  fontVariantNumeric: "tabular-nums",
});

/* sanitize 본문은 commentItem.css.ts의 bubble을 쓴다. 본 파일은 list/row/head/time/empty/formWrap만 정의. */

export const state = style({
  padding: "20px 4px",
  textAlign: "center",
  fontSize: 12.5,
  color: muted,
});

/* 빈 상태 카드 — 시안 `.emptystate` 아이콘 링 + 제목 + 설명. */
export const emptyState = style({
  textAlign: "center",
  padding: "36px 20px",
});

export const emptyRing = style({
  width: 48,
  height: 48,
  borderRadius: 999,
  background: `color-mix(in srgb, ${accent} 8%, ${surface})`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 12px",
  color: accent,
});

export const emptyTitle = style({
  fontSize: 14,
  fontWeight: 700,
  color: heading,
  marginBottom: 4,
});

export const emptyDesc = style({
  fontSize: 12.5,
  color: muted,
  lineHeight: 1.6,
});

/* 폼 영역 — 시안 `.divider`(목록 ↔ 폼 구분선). */
export const formWrap = style({
  marginTop: 16,
  paddingTop: 16,
  borderTop: `1px solid ${border}`,
});

/* 새 검토 의견 라벨 — 시안 `.seclabel`. */
export const sectionLabel = style({
  fontSize: 11,
  fontWeight: 800,
  color: muted,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  margin: "0 0 10px",
});
