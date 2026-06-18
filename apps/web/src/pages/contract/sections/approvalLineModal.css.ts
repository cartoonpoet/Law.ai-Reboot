import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const TYPE_COLORS = {
  draft: themeVars.color.textSecondary,
  approve: themeVars.color.accentPrimary,
  agree: themeVars.color.accentInfo,
  refer: themeVars.color.accentSuccess,
} as const;

const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;

/* 2-pane: 좌 인물 추가 / 우 결재 흐름 */
export const bodyGrid = style({
  display: "grid",
  gridTemplateColumns: "256px 1fr",
  height: 452,
  border: `1px solid ${border}`,
  borderRadius: 12,
  overflow: "hidden",
});

/* ── 좌측: 결재자 추가 ── */
export const leftPane = style({ display: "flex", flexDirection: "column", background: surfaceAlt, borderRight: `1px solid ${border}`, minHeight: 0 });
export const leftHead = style({ padding: "13px 14px 8px", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.02em", color: themeVars.color.textMuted });
export const leftSearch = style({ padding: "0 12px 10px" });
export const peopleScroll = style({ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 10px" });
export const personRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  transition: "background-color 120ms ease",
  selectors: { "&:hover": { background: surface } },
});
export const personRowOn = style({ opacity: 0.55 });
export const personMain = style({ flex: 1, minWidth: 0 });
export const personName = style({ fontSize: 12.5, fontWeight: 600, color: themeVars.color.textHeading });
export const personDept = style({ fontSize: 11, color: themeVars.color.textMuted, marginTop: 1 });
export const personAdd = style({ color: themeVars.color.accentPrimary, display: "inline-flex", flexShrink: 0 });
export const personCheck = style({ color: themeVars.color.accentSuccess, display: "inline-flex", flexShrink: 0 });

/* ── 우측: 결재 흐름 ── */
export const rightPane = style({ display: "flex", flexDirection: "column", padding: 18, overflowY: "auto", gap: 14, minHeight: 0 });
export const rightHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 });
export const flowTitle = style({ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: themeVars.color.textHeading });
export const summaryChips = style({ display: "flex", gap: 6, flexWrap: "wrap" });
export const chip = styleVariants(TYPE_COLORS, (color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color,
  background: `color-mix(in srgb, ${color} 12%, ${surface})`,
}));

export const flow = style({ display: "flex", flexDirection: "column" });
export const stepRow = style({
  display: "flex",
  gap: 14,
  alignItems: "stretch",
  position: "relative",
  marginBottom: 10,
  selectors: { "&:last-child": { marginBottom: 0 } },
});
export const nodeCol = style({ position: "relative", width: 36, flexShrink: 0, display: "flex", justifyContent: "center" });
/** 노드 아래로 다음 단계까지 잇는 연결선 */
export const connector = style({ position: "absolute", left: 17, top: 38, bottom: -10, width: 2, background: border, zIndex: 0 });
/** 아바타를 감싸 유형색 링 + 라인 위로 띄움 */
export const node = styleVariants(TYPE_COLORS, (color) => ({
  alignSelf: "flex-start",
  zIndex: 1,
  borderRadius: 999,
  background: surface,
  boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 16%, ${surface})`,
}));

export const stepCard = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  border: `1px solid ${border}`,
  borderRadius: 11,
  background: surface,
  transition: "box-shadow 120ms ease, border-color 120ms ease",
  selectors: { "&:hover": { boxShadow: "0 2px 10px rgba(16,24,40,0.07)", borderColor: themeVars.color.neutralBorderStrong } },
});
export const stepMain = style({ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 });
export const stepName = style({ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: themeVars.color.textHeading });
export const stepDept = style({ fontSize: 11.5, color: themeVars.color.textMuted });
export const typeBadge = styleVariants(TYPE_COLORS, (color) => ({
  flexShrink: 0,
  padding: "1px 8px",
  borderRadius: 5,
  fontSize: 10.5,
  fontWeight: 700,
  color,
  background: `color-mix(in srgb, ${color} 14%, ${surface})`,
}));
export const stepActions = style({ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 });

/* 드래그 정렬 */
export const cardDrag = style({ cursor: "grab" });
export const dragging = style({ opacity: 0.4 });
export const grip = style({ display: "inline-flex", flexShrink: 0, color: themeVars.color.textMuted, cursor: "grab" });

/* 우측 추가 영역(유형 선택) */
export const typePick = style({ display: "flex", alignItems: "center", gap: 8 });

/* 푸터 */
export const footRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 });
export const footInfo = style({ fontSize: 12.5, color: themeVars.color.textMuted });
export const footBtns = style({ display: "flex", gap: 8 });
