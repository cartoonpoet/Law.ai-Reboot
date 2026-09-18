import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { T } from "../../design/tokens";

/* 관리자 콘솔 틀 — 사용자 사이트와 같은 어두운 사이드바 + 본문. 상단 헤더는 두지 않는다. */
const c = themeVars.color;
const HOVER = "rgba(255,255,255,.04)";

export const shell = style({ display: "flex", minHeight: "100vh", background: c.neutralBackground });

export const aside = style({
  width: 232,
  flexShrink: 0,
  background: T.navy,
  borderRight: `1px solid ${T.navyLine}`,
  display: "flex",
  flexDirection: "column",
  position: "sticky",
  top: 0,
  height: "100vh",
});

export const brand = style({
  padding: "18px 16px 14px",
  borderBottom: `1px solid ${T.navyLine}`,
  display: "flex",
  alignItems: "center",
  gap: 9,
});

export const brandLogo = style({
  width: 26,
  height: 26,
  borderRadius: 7,
  background: `linear-gradient(135deg, ${T.primary} 0%, #6366f1 100%)`,
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const brandText = style({ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" });

export const brandTextDim = style({ opacity: 0.45 });

export const brandBadge = style({
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: T.navyMuted,
  marginTop: 1,
});

export const nav = style({ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 1 });

export const sectionLabel = style({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: T.navyFaint,
  padding: "14px 10px 6px",
});

export const sectionLabelFirst = style({ paddingTop: 6 });

const rowBase = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  fontFamily: "Pretendard",
  fontSize: 13,
  textAlign: "left",
  transition: "background-color .15s ease, color .15s ease",
} as const;

export const row = style({
  ...rowBase,
  color: T.navyMuted,
  fontWeight: 500,
  cursor: "pointer",
  selectors: { "&:hover": { background: HOVER, color: T.navyText } },
});

export const rowActive = style({ ...rowBase, background: T.primary, color: "#fff", fontWeight: 700, cursor: "pointer" });

// 아직 만들지 않은 메뉴 — 눌리지 않는다.
export const rowDisabled = style({ ...rowBase, color: T.navyFaint, cursor: "default" });

export const icon = style({ width: 16, height: 16, flexShrink: 0, opacity: 0.85 });

export const label = style({ flex: 1 });

// 안 읽은 문의 수 — 메뉴 오른쪽 작은 숫자.
export const navBadge = style({
  minWidth: 18,
  padding: "1px 6px",
  borderRadius: 999,
  background: c.accentDanger,
  color: "#fff",
  fontSize: 10.5,
  fontWeight: 700,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});

export const foot = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 12,
  borderTop: `1px solid ${T.navyLine}`,
});

export const footMain = style({ minWidth: 0, flex: 1 });

export const footName = style({ fontSize: 12.5, fontWeight: 600, color: T.navyText });

export const footEmail = style({
  fontSize: 11,
  color: T.navyFaint,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const footButton = style({
  border: "none",
  background: "transparent",
  color: T.navyMuted,
  cursor: "pointer",
  padding: 4,
  borderRadius: 6,
  display: "flex",
  selectors: { "&:hover": { background: HOVER, color: T.navyText } },
});

/* 본문 */
export const main = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" });

export const content = style({ padding: 24, display: "flex", flexDirection: "column", gap: 16 });

export const pageHead = style({ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 });

export const titleGroup = style({ display: "flex", flexDirection: "column", gap: 6 });

export const eyebrow = style({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: c.textDisabled,
});

export const pageTitle = style({ margin: 0, fontSize: 22, fontWeight: 800, color: c.textHeading, letterSpacing: "-0.025em" });

export const pageDesc = style({ margin: 0, fontSize: 13, color: c.textMuted });
