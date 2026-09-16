import { style } from "@vanilla-extract/css";
import { themeVars as c } from "@lawkit/ui";

const FAINT = c.color.textMuted;
// 비서 대화 화면과 같은 보라 계열 강조색 — 문의도 같은 비서 안이라 톤을 맞춘다.
const ACCENT = "#5b3df5";

// 모든 화면이 같은 좌우 여백(16)을 쓴다.
export const scroll = style({
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const headerTitle = style({
  flex: 1,
  minWidth: 0,
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
  color: c.color.textHeading,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

// 뒤로가기 버튼이 없을 때 제목이 벽에 붙지 않게.
export const headerTitleFlush = style({ paddingLeft: 6 });

export const intro = style({
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.6,
  color: c.color.textSecondary,
});

export const primaryButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 40,
  padding: "0 16px",
  border: "none",
  borderRadius: 10,
  background: ACCENT,
  color: c.color.textInverse,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  selectors: {
    "&:hover": { filter: "brightness(1.08)" },
    "&:disabled": { opacity: 0.6, cursor: "default" },
  },
});

export const threadList = style({ display: "flex", flexDirection: "column", gap: 8 });

export const threadButton = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${c.color.neutralBorder}`,
  borderRadius: 10,
  background: c.color.neutralSurface,
  textAlign: "left",
  cursor: "pointer",
  selectors: { "&:hover": { borderColor: ACCENT } },
});

export const threadTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const threadSubject = style({
  fontSize: 13,
  fontWeight: 700,
  color: c.color.textHeading,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const threadPreview = style({
  fontSize: 12,
  color: FAINT,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const threadTime = style({ fontSize: 11, color: FAINT });

export const statusBadge = style({
  flexShrink: 0,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  border: `1px solid ${c.color.neutralBorder}`,
  color: c.color.textSecondary,
});

export const statusAnswered = style({
  borderColor: c.color.accentSuccess,
  color: c.color.accentSuccess,
});

export const statusClosed = style({ color: FAINT });

export const emptyText = style({
  margin: "20px 0",
  fontSize: 12.5,
  color: c.color.textSecondary,
  textAlign: "center",
});

// 입력 영역 — 목록/대화와 같은 좌우 여백(16), 위쪽 구분선.
export const formArea = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  borderTop: `1px solid ${c.color.neutralBorder}`,
});

export const label = style({ fontSize: 11, fontWeight: 700, color: c.color.textSecondary });

// 라벨 바로 아래 입력칸이 붙도록 묶음 단위로 간격을 준다.
export const field = style({ display: "flex", flexDirection: "column", gap: 6 });

export const input = style({
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${c.color.neutralBorder}`,
  borderRadius: 8,
  fontSize: 13,
  color: c.color.textPrimary,
  background: c.color.neutralSurface,
  selectors: { "&:focus": { outline: "none", borderColor: ACCENT } },
});

export const textarea = style([
  input,
  { minHeight: 88, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 },
]);

export const contextBox = style({
  padding: "10px 12px",
  borderRadius: 8,
  background: c.color.neutralSurfaceAlt,
  fontSize: 11.5,
  lineHeight: 1.6,
  color: c.color.textSecondary,
  wordBreak: "break-all",
});

export const messageRow = style({ display: "flex", flexDirection: "column", gap: 4 });

export const messageMine = style({ alignItems: "flex-end" });

export const bubble = style({
  maxWidth: "85%",
  padding: "10px 12px",
  borderRadius: 12,
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: c.color.neutralSurfaceAlt,
  color: c.color.textPrimary,
});

export const bubbleMine = style({ background: ACCENT, color: c.color.textInverse });

export const messageMeta = style({ fontSize: 11, color: FAINT });
