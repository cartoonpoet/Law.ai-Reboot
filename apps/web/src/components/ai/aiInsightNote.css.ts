import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { AI_BORDER, AI_TEXT, AI_TINT } from "../ui/aiTone";

const c = themeVars.color;

export const note = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: 6,
  maxWidth: "100%",
  fontSize: 12,
  color: c.textMuted,
  minWidth: 0,
});

export const tag = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  flexShrink: 0,
  fontSize: 10.5,
  fontWeight: 800,
  color: AI_TEXT,
  background: AI_TINT,
  border: `1px solid ${AI_BORDER}`,
  borderRadius: 4,
  padding: "1px 6px",
  letterSpacing: "0.03em",
});

export const tagIcon = style({ width: 10, height: 10, color: AI_TEXT });

export const text = style({ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });

export const textTone = styleVariants({
  danger: { color: c.accentDangerActive, fontWeight: 600 },
  warning: { color: c.accentWarningActive, fontWeight: 600 },
  info: { color: c.textSecondary },
  muted: { color: c.textMuted },
});
