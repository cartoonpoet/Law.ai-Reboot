import { style } from "@vanilla-extract/css";
import { AI_TEXT, AI_TINT } from "./aiTone";

export const aiNote = style({
  display: "inline-flex",
  alignItems: "flex-start",
  alignSelf: "flex-start",
  gap: 5,
  padding: "2px 8px",
  borderRadius: 6,
  background: AI_TINT,
  color: AI_TEXT,
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: "100%",
});

export const aiIcon = style({ flexShrink: 0, marginTop: 2, width: 13, height: 13, color: AI_TEXT });
