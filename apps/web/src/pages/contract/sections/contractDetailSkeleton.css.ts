import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { LAYOUT } from "../contractDetail.css";

/* =========================================================================
 * ContractDetailSkeleton 전용 레이아웃 클래스.
 * 치수는 contractDetail.css.ts 의 LAYOUT export 에서 단일 도출(드리프트 방지).
 * 색/보더는 themeVars 만(로컬 hex 0, 인라인 0).
 * ======================================================================= */

const c = themeVars.color;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = `color-mix(in srgb, ${c.neutralBorder} 50%, transparent)`;
const SURFACE = c.neutralSurface;

/* 카드(실 레이아웃 css.card 와 동일 치수) */
export const card = style({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  boxShadow: themeVars.shadow.raised,
  overflow: "hidden",
});

export const cardHead = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 18px",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
});

export const cardBody = style({
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

/* hero 영역 */
export const hero = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 14,
});

export const heroRow = style({ display: "flex", alignItems: "center", gap: 10 });

/* at-a-glance(6셀 그리드 — LAYOUT.glanceColumns) */
export const glance = style({
  display: "grid",
  gridTemplateColumns: `repeat(${LAYOUT.glanceColumns}, 1fr)`,
  gap: 1,
  background: BORDER_SUBTLE,
  border: `1px solid ${BORDER}`,
  borderRadius: LAYOUT.cardRadius,
  overflow: "hidden",
  marginBottom: 16,
  boxShadow: themeVars.shadow.raised,
});

export const glanceCell = style({
  background: SURFACE,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

/* StepBar 자리(lifebar wrapper 와 동일 padding) */
export const stepbar = style({ padding: "8px 2px" });

export const stepbarRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

/* 본문 2컬럼(rail-grid 와 동일: 1fr railWidth) */
export const railGrid = style({
  display: "grid",
  gridTemplateColumns: `1fr ${LAYOUT.railWidth}px`,
  gap: LAYOUT.railGridGap,
  alignItems: "start",
});

export const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: LAYOUT.stackGap,
});

/* facts 그리드(2열) */
export const facts = style({
  display: "grid",
  gridTemplateColumns: `repeat(${LAYOUT.factsColumns}, 1fr)`,
  gap: `${LAYOUT.factsRowGap}px ${LAYOUT.factsColGap}px`,
});

export const factCell = style({ display: "flex", flexDirection: "column", gap: 6 });
