import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const approverList = style({ display: "flex", flexDirection: "column", gap: 10 });

export const approverHint = style({ margin: 0, fontSize: 12, lineHeight: 1.55, color: c.textMuted });

export const lineSection = style({ display: "flex", flexDirection: "column", gap: 8 });

export const lineSections = style({ display: "flex", flexDirection: "column", gap: 18 });

export const lineTitle = style({ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: c.textMuted });

export const lineStatus = style({ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: c.textMuted });
