import { style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

export const root = style({ position: "relative", padding: "10px 12px 0" });

/* 접힌 트리거(2개+ 소속) / 표시 전용(1개 소속) 공통 행 */
const triggerBase = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "7px 10px",
  borderRadius: 7,
  background: "rgba(255,255,255,.06)",
  border: `1px solid ${T.navyLine}`,
} as const;

export const trigger = style({
  ...triggerBase,
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
  selectors: { "&:hover": { background: "rgba(255,255,255,.1)" } },
});

export const triggerStatic = style(triggerBase);

export const badge = style({
  width: 20,
  height: 20,
  borderRadius: 5,
  background: T.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10.5,
  fontWeight: 800,
  flexShrink: 0,
});

export const name = style({
  flex: 1,
  fontSize: 12.5,
  fontWeight: 700,
  color: T.navyText,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const caret = style({ fontSize: 9, color: T.navyMuted, flexShrink: 0 });

/* 외부 클릭 닫기용 투명 backdrop (NotificationBell 패턴) */
export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 40,
  background: "transparent",
  border: "none",
  cursor: "default",
});

/* 위로 펼치는 드롭다운 — 라이트 서피스 */
export const panel = style({
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: 12,
  right: 12,
  zIndex: 50,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxShadow: "0 4px 15px rgba(44,63,88,.35)",
  overflow: "hidden",
});

export const panelHeader = style({
  padding: "9px 12px 7px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: T.faint,
  borderBottom: `1px solid ${T.border}`,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "9px 12px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
  selectors: {
    "&:hover": { background: T.surfaceAlt },
    "&:disabled": { cursor: "default", opacity: 0.6 },
  },
});

export const itemActive = style({ background: T.primarySoft });

export const itemBadge = style({
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

export const itemMain = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
});
export const itemName = style({ fontSize: 12.5, fontWeight: 700, color: T.heading });
export const itemRole = style({ fontSize: 11, color: T.muted, marginTop: 1 });
export const itemCheck = style({ color: T.primary, fontWeight: 800, fontSize: 12 });

export const errorText = style({
  padding: "8px 12px",
  fontSize: 11.5,
  color: T.danger,
  borderTop: `1px solid ${T.border}`,
  margin: 0,
});
