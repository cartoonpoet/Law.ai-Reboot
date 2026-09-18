import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const searchBox = style({ flex: 1, minWidth: 200, maxWidth: 320 });

export const searchIcon = style({ width: 15, height: 15, color: themeVars.color.textDisabled });

export const listCount = style({ fontSize: 12.5, color: themeVars.color.textMuted, fontVariantNumeric: "tabular-nums" });

export const intro = style({
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
  margin: "0 0 14px",
});

export const filterBar = style({ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 });

export const filterLabel = style({ fontSize: 11, fontWeight: 700, color: themeVars.color.textSecondary });

export const openCount = style({ fontSize: 12, color: themeVars.color.accentDanger, fontWeight: 700 });

export const layout = style({
  display: "grid",
  gridTemplateColumns: "minmax(260px, 340px) 1fr",
  gap: 14,
  alignItems: "start",
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "1fr" } },
});

export const listBox = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  overflow: "hidden",
});

export const threadButton = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "100%",
  padding: "12px 14px",
  border: "none",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurface,
  textAlign: "left",
  cursor: "pointer",
});

export const threadActive = style({ background: themeVars.color.neutralSurfaceAlt });

export const threadTop = style({ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" });

export const subject = style({
  fontSize: 13,
  fontWeight: 700,
  color: themeVars.color.textHeading,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const meta = style({ fontSize: 11.5, color: themeVars.color.textMuted });

export const preview = style({
  fontSize: 12,
  color: themeVars.color.textSecondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const statusBadge = style({
  flexShrink: 0,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  color: themeVars.color.textSecondary,
});

export const statusOpen = style({ borderColor: themeVars.color.accentDanger, color: themeVars.color.accentDanger });

export const statusAnswered = style({ borderColor: themeVars.color.accentSuccess, color: themeVars.color.accentSuccess });

export const detailBox = style({
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const detailHead = style({ display: "flex", flexDirection: "column", gap: 4 });

export const detailSubject = style({ margin: 0, fontSize: 15, fontWeight: 800, color: themeVars.color.textHeading });

export const contextBox = style({
  padding: "8px 10px",
  borderRadius: 8,
  background: themeVars.color.neutralSurfaceAlt,
  fontSize: 11.5,
  lineHeight: 1.5,
  color: themeVars.color.textSecondary,
  wordBreak: "break-all",
});

export const messageList = style({ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" });

export const messageRow = style({ display: "flex", flexDirection: "column", gap: 4 });

export const messageMine = style({ alignItems: "flex-end" });

export const bubble = style({
  maxWidth: "80%",
  padding: "10px 12px",
  borderRadius: 12,
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: themeVars.color.neutralSurfaceAlt,
  color: themeVars.color.textPrimary,
});

export const bubbleMine = style({ background: themeVars.color.accentPrimary, color: themeVars.color.textInverse });

export const messageMeta = style({ fontSize: 11, color: themeVars.color.textMuted });

export const replyArea = style({ display: "flex", flexDirection: "column", gap: 8 });

export const textarea = style({
  width: "100%",
  minHeight: 96,
  padding: "10px 12px",
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: "inherit",
  resize: "vertical",
  color: themeVars.color.textPrimary,
  background: themeVars.color.neutralSurface,
});

export const buttonRow = style({ display: "flex", gap: 8, justifyContent: "flex-end" });

export const placeholder = style({ fontSize: 12.5, color: themeVars.color.textSecondary, padding: 28, textAlign: "center" });

export const errorText = style({ fontSize: 12, color: themeVars.color.accentDanger, margin: 0 });
