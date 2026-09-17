import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 법률자문 화면 공통 — 페이지 머리(eyebrow + 제목 + 버튼) */
const c = themeVars.color;

export const pageHead = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
});

export const pageTitleGroup = style({ display: "flex", flexDirection: "column", gap: 7 });

export const pageTitle = style({
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: c.textHeading,
  letterSpacing: "-0.025em",
});

export const pageActions = style({ display: "flex", gap: 8, flexShrink: 0 });
