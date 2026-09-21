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
/** 계약서 칸 바로 아래 “표준계약서 양식 보기” 줄 — 업로드 영역과 같은 간격(10)을 둔다. */
export const fieldActionRow = style({ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 });

/* 계약 규모(대가) 행 */
export const moneyRow = style({ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 });
export const moneyVat = style({ flex: "0 0 200px", maxWidth: 200 });
export const moneyAmount = style({ flex: 1, minWidth: 160 });
export const moneyCurrency = style({ flex: "0 0 160px", maxWidth: 160 });
export const moneyDelete = style({ flexShrink: 0 });
export const fieldBlock = style({ marginTop: 10 });

/* 레일 결재선 패널 */
export const railHead = style({ display: "inline-flex", alignItems: "center", gap: 8 });
export const railHeadIcon = style({ width: 15, height: 15, color: themeVars.color.textMuted });
export const apprList = style({ display: "flex", flexDirection: "column", gap: 10 });
export const apprRow = style({ display: "flex", alignItems: "center", gap: 10 });
export const apprMain = style({ flex: 1, minWidth: 0 });
export const apprName = style({ fontSize: 13, fontWeight: 600, color: themeVars.color.textHeading });
export const apprDept = style({ fontSize: 11, color: themeVars.color.textMuted });

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

export const errText = style({ marginTop: 5, fontSize: 12, color: themeVars.color.accentDanger });

/* AI 사전 점검 안내(저장 후 자동 분석 — 폼 내 동기 mock 패널 대체) */
export const aiNotice = style({ fontSize: 12, color: themeVars.color.textMuted, lineHeight: 1.6 });

export const submitIcon = style({ width: 14, height: 14 });

export const submitError = style({
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  color: themeVars.color.accentDanger,
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.accentDanger}`,
});

/* 등록 유형 분기 — 시안의 강조 박스 */
export const modeRow = style({
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 5%, ${themeVars.color.neutralSurface})`,
  border: `1px solid color-mix(in srgb, ${themeVars.color.accentPrimary} 18%, ${themeVars.color.neutralSurface})`,
  borderRadius: 6,
  padding: "13px 14px",
  marginBottom: 18,
  gridColumn: "1 / -1",
});

export const modeHelp = style({
  fontSize: 11.5,
  color: themeVars.color.textMuted,
  marginTop: 8,
  lineHeight: 1.6,
});

/* 변경·해지 + 체결 완료 등록 = 원 계약 필수 강조 */
export const origRequired = style({
  background: `color-mix(in srgb, ${themeVars.color.accentWarning} 8%, ${themeVars.color.neutralSurface})`,
  border: `1px solid color-mix(in srgb, ${themeVars.color.accentWarning} 26%, ${themeVars.color.neutralSurface})`,
  borderRadius: 6,
  padding: "12px 13px",
  gridColumn: "1 / -1",
});

export const origOptional = style({ gridColumn: "1 / -1" });
