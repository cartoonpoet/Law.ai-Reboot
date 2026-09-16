import { style } from "@vanilla-extract/css";
import { themeVars as c } from "@lawkit/ui";

const FAINT = c.color.textMuted;

export const scroll = style({ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 });

export const headerTitle = style({ margin: 0, fontSize: 14, fontWeight: 800, color: c.color.textHeading });

export const intro = style({ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: c.color.textSecondary });

export const threadButton = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${c.color.neutralBorder}`,
  borderRadius: 10,
  background: c.color.neutralSurface,
  textAlign: "left",
  cursor: "pointer",
});

export const threadTop = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 });

export const threadSubject = style({ fontSize: 13, fontWeight: 700, color: c.color.textHeading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const threadPreview = style({ fontSize: 12, color: FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const threadTime = style({ fontSize: 11, color: FAINT, flexShrink: 0 });

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

export const emptyText = style({ margin: "24px 0", fontSize: 12.5, color: c.color.textSecondary, textAlign: "center" });

export const formArea = style({ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px", borderTop: `1px solid ${c.color.neutralBorder}` });

export const label = style({ fontSize: 11, fontWeight: 700, color: c.color.textSecondary });

export const input = style({
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${c.color.neutralBorder}`,
  borderRadius: 8,
  fontSize: 13,
  color: c.color.textPrimary,
  background: c.color.neutralSurface,
});

export const textarea = style([input, { minHeight: 84, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }]);

export const contextBox = style({
  padding: "8px 10px",
  borderRadius: 8,
  background: c.color.neutralSurfaceAlt,
  fontSize: 11.5,
  lineHeight: 1.5,
  color: c.color.textSecondary,
  wordBreak: "break-all",
});

export const buttonRow = style({ display: "flex", gap: 8, justifyContent: "flex-end" });

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

export const bubbleMine = style({ background: c.color.accentPrimary, color: c.color.textInverse });

export const messageMeta = style({ fontSize: 11, color: FAINT });
