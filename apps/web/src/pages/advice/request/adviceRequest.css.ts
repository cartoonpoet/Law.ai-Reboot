import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const alertRow = style({ marginBottom: 14 });

export const detailStack = style({ display: "flex", flexDirection: "column", gap: 18 });

export const counterpartyInput = style({ flex: 1, minWidth: 0 });

export const flowList = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 });

export const flowItem = style({ display: "flex", gap: 10, alignItems: "flex-start" });

export const flowNum = style({
  flexShrink: 0,
  width: 20,
  height: 20,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: c.textMuted,
  background: c.neutralSurfaceRaised,
  fontVariantNumeric: "tabular-nums",
});

export const flowTitle = style({ fontSize: 12.5, fontWeight: 700, color: c.textHeading });

export const flowDesc = style({ fontSize: 12, color: c.textMuted, lineHeight: 1.55 });
