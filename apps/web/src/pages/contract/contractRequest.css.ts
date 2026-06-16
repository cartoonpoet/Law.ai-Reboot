import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const layout = style({
  display: "grid",
  gridTemplateColumns: "1fr 340px",
  gap: 18,
  alignItems: "start",
  "@media": { "screen and (max-width: 1024px)": { gridTemplateColumns: "1fr" } },
});

export const formCol = style({ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 });
export const rail = style({ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 });

export const grid2 = style({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" });
export const grid3 = style({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 });
export const grid4 = style({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 });
export const full = style({ gridColumn: "1 / -1" });

export const docsBody = style({ display: "flex", flexDirection: "column", gap: 16 });
export const fileList = style({ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 });
export const btnRow = style({ display: "flex", gap: 10, flexWrap: "wrap" });

export const prgRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  cursor: "pointer",
  selectors: { "&:last-child": { borderBottom: "none" } },
});
export const prgDot = style({ width: 20, height: 20, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" });
export const prgLabel = style({ flex: 1, fontSize: 12.5, fontWeight: 700, color: themeVars.color.textHeading });

export const drisk = style({ background: themeVars.color.neutralSurface, border: `1px solid ${themeVars.color.neutralBorder}`, borderRadius: 8, padding: "11px 12px" });
export const errText = style({ marginTop: 5, fontSize: 12, color: themeVars.color.accentDanger });
