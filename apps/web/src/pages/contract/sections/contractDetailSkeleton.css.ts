import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { LAYOUT_COLUMNS, LAYOUT_GAP, FACT_COLUMNS, FACT_GAP } from "../contractDetail.css";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;

/* 상세 페이지 형태를 모사한 스켈레톤 레이아웃 — lawkit Skeleton 조합. */
export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const headerLine = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

const card = {
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.md,
  padding: 18,
} as const;

export const panel = style(card);

export const stepperPanel = style({
  ...card,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

export const layout = style({
  display: "grid",
  gridTemplateColumns: LAYOUT_COLUMNS,
  gap: LAYOUT_GAP,
  alignItems: "start",
});

export const mainColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: 18,
  minWidth: 0,
});

export const sideColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const factGrid = style({
  display: "grid",
  gridTemplateColumns: FACT_COLUMNS,
  gap: FACT_GAP,
});

export const factCell = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});
