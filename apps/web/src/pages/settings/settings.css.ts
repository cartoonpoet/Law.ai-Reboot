import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

/* 페이지 — 시스템 관리(systemSettings.css) 규격에 왼쪽 탭을 더한 폭 */
export const page = style({ padding: 24, maxWidth: 880, display: "flex", flexDirection: "column", gap: 16 });

export const head = style({ display: "flex", flexDirection: "column", gap: 4 });

export const title = style({ margin: 0, fontSize: 18, fontWeight: 700, color: c.textHeading });

export const sub = style({ margin: 0, fontSize: 12.5, color: c.textSecondary });

export const split = style({
  display: "grid",
  gridTemplateColumns: "200px minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr" } },
});

/* 왼쪽 탭 */
export const tabs = style({ display: "flex", flexDirection: "column", gap: 2 });

export const tab = style({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  padding: "9px 12px",
  border: "none",
  borderRadius: themeVars.radius.md,
  background: "transparent",
  font: "inherit",
  fontSize: 13.5,
  color: c.textHeading,
  textAlign: "left",
  cursor: "pointer",
  selectors: { "&:hover": { background: `color-mix(in srgb, ${c.textHeading} 5%, transparent)` } },
});

export const tabActive = style({
  background: c.neutralSurface,
  color: c.accentPrimary,
  fontWeight: 700,
  boxShadow: themeVars.shadow.raised,
  selectors: { "&:hover": { background: c.neutralSurface } },
});

export const tabHint = style({ fontSize: 11.5, fontWeight: 400, color: c.textSecondary });

/* 카드 */
export const card = style({
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: themeVars.radius.lg,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const cardTitle = style({ margin: 0, fontSize: 13.5, fontWeight: 700, color: c.textHeading });

export const cardDesc = style({ margin: "2px 0 0", fontSize: 12, color: c.textSecondary });

export const form = style({ display: "flex", flexDirection: "column", gap: 16 });

export const grid2 = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "1fr" } },
});

export const field = style({ display: "flex", flexDirection: "column", gap: 6 });

export const label = style({ fontSize: 12.5, fontWeight: 600, color: c.textSecondary });

export const readOnlyBox = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minHeight: 38,
  padding: "0 12px",
  borderRadius: themeVars.radius.md,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurfaceAlt,
  fontSize: 13.5,
  color: c.textHeading,
});

export const readOnlyNote = style({ fontSize: 11, color: c.textSecondary, flexShrink: 0 });

export const helper = style({ margin: 0, fontSize: 11.5, color: c.textSecondary });

export const errorText = style({ margin: 0, fontSize: 12, color: c.accentDanger });

export const actions = style({ display: "flex", justifyContent: "flex-end", gap: 8 });

/* 프로필 사진 */
export const profileRow = style({ display: "flex", alignItems: "center", gap: 16 });

export const avatarControls = style({ display: "flex", flexDirection: "column", gap: 6 });

export const avatarButtons = style({ display: "flex", alignItems: "center", gap: 8 });

// 파일 선택창을 여는 버튼 모양 라벨 — 안의 file input 은 화면에서 숨기되 키보드·스크린리더에는 남긴다.
export const fileButton = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  borderRadius: themeVars.radius.md,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurface,
  fontSize: 12.5,
  fontWeight: 600,
  color: c.textHeading,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: c.neutralSurfaceAlt },
    "&:focus-within": { boxShadow: themeVars.shadow.focus },
  },
});

export const fileInput = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
});

/* 알림 */
export const switchRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 0",
  borderTop: `1px solid ${c.neutralBorder}`,
  selectors: { "&:first-of-type": { borderTop: "none", paddingTop: 0 } },
});

export const switchText = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });

export const switchTitle = style({ fontSize: 13.5, fontWeight: 600, color: c.textHeading });

export const soonBadge = style({
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: c.neutralSurfaceAlt,
  color: c.textSecondary,
  flexShrink: 0,
});

/* 비밀번호 조건 */
export const rules = style({ display: "flex", flexWrap: "wrap", gap: "6px 14px", margin: 0, padding: 0, listStyle: "none" });

export const rule = style({ fontSize: 11.5, color: c.textSecondary });

export const ruleOk = style({ color: c.accentSuccess });

/* 소속 회사 */
export const table = style({ width: "100%", borderCollapse: "collapse", fontSize: 13 });

export const th = style({
  textAlign: "left",
  fontSize: 11.5,
  fontWeight: 600,
  color: c.textSecondary,
  padding: "0 0 8px",
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const td = style({ padding: "11px 0", borderBottom: `1px solid ${c.neutralBorder}`, color: c.textHeading });

export const tdStrong = style({ fontWeight: 700 });

export const chip = style({
  display: "inline-flex",
  fontSize: 11.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: themeVars.radius.sm,
  background: `color-mix(in srgb, ${c.accentPrimary} 10%, ${c.neutralSurface})`,
  color: c.accentPrimary,
});

export const chipMuted = style({ background: c.neutralSurfaceAlt, color: c.textSecondary });

export const empty = style({ margin: 0, padding: 16, fontSize: 12.5, color: c.textSecondary });
