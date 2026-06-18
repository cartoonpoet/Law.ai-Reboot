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

export const browseRow = style({ height: 42, display: "flex", alignItems: "center", gap: 10 });
export const browseCount = style({ fontSize: 12, fontWeight: 600, color: themeVars.color.textMuted });
export const docsBody = style({ display: "flex", flexDirection: "column", gap: 16 });
export const fileList = style({ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 });
export const btnRow = style({ display: "flex", gap: 10, flexWrap: "wrap" });

/* 계약 규모(대가) 행 */
export const moneyRow = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 });
export const moneyVat = style({ flex: "0 0 200px", maxWidth: 200 });
export const moneyAmount = style({ flex: 1, minWidth: 160 });
export const moneyCurrency = style({ flex: "0 0 160px", maxWidth: 160 });
export const moneyDelete = style({ flexShrink: 0 });
export const fieldBlock = style({ marginTop: 10 });

/* 기타 URL 목록 */
export const urlList = style({ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 });
export const urlRow = style({ display: "flex", gap: 10, alignItems: "center" });
export const urlInput = style({ flex: 1, minWidth: 0 });

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
