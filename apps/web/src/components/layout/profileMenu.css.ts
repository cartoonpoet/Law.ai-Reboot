import { style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

/* 사이드바 맨 아래 내 이름 영역(버튼) + 위로 펼치는 계정 메뉴 */
export const root = style({ position: "relative" });

export const trigger = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "12px 14px",
  border: "none",
  borderTop: `1px solid ${T.navyLine}`,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
  selectors: { "&:hover": { background: "rgba(255,255,255,.04)" } },
});

export const avatar = style({
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

export const main = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" });
export const name = style({ fontSize: 12.5, fontWeight: 700, color: T.navyText });
export const sub = style({
  fontSize: 11,
  color: T.navyMuted,
  marginTop: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
export const caret = style({ fontSize: 9, color: T.navyMuted, flexShrink: 0 });

/* 외부 클릭 닫기용 투명 backdrop */
export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 40,
  background: "transparent",
  border: "none",
  cursor: "default",
});

export const panel = style({
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: 12,
  right: 12,
  zIndex: 50,
  padding: 6,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  boxShadow: "0 4px 15px rgba(44,63,88,.35)",
});

export const who = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 10px 10px",
  marginBottom: 4,
  borderBottom: `1px solid ${T.border}`,
});
export const whoName = style({ fontSize: 13, fontWeight: 700, color: T.heading });
export const whoSub = style({ fontSize: 11.5, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });

const rowBase = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
} as const;

export const menuItem = style({
  ...rowBase,
  fontSize: 13,
  color: T.heading,
  selectors: { "&:hover": { background: T.surfaceAlt } },
});

export const menuItemDanger = style({ color: T.danger });

export const menuIcon = style({ width: 15, height: 15, color: "currentColor", opacity: 0.75 });

export const group = style({ margin: "4px 0", padding: "4px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` });

export const groupLabel = style({
  padding: "6px 10px 4px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: T.faint,
});

export const tenantItem = style({
  ...rowBase,
  selectors: {
    "&:hover": { background: T.surfaceAlt },
    "&:disabled": { cursor: "default", opacity: 0.6 },
  },
});

export const tenantItemActive = style({ background: T.primarySoft });

export const tenantBadge = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  background: T.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
  flexShrink: 0,
});

export const tenantMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" });
export const tenantName = style({ fontSize: 12.5, fontWeight: 700, color: T.heading });
export const tenantRole = style({ fontSize: 11, color: T.muted, marginTop: 1 });
export const tenantCheck = style({ color: T.primary, fontWeight: 800, fontSize: 12 });

export const errorText = style({ margin: 0, padding: "6px 10px", fontSize: 11.5, color: T.danger });
