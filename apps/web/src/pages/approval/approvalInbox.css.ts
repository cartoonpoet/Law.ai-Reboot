import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 결재 대기함 — 계약·법률자문 조회와 같은 목록 구성(머리 → 탭 + 총건수 → 표). */
const c = themeVars.color;

export const pageHead = style({ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 });

export const pageTitle = style({
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: c.textHeading,
  letterSpacing: "-0.025em",
});

export const doc = style({ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 });

export const docTitle = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const docTitleDeleted = style([docTitle, { color: c.textDisabled, textDecoration: "line-through" }]);

export const docMeta = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const person = style({ display: "flex", alignItems: "center", gap: 8 });

export const personName = style({ fontSize: 12.5, fontWeight: 600, color: c.textSecondary });

export const personDept = style({ fontSize: 11.5, color: c.textMuted });

export const step = style({ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" });

export const stepPos = style({ fontSize: 12.5, fontWeight: 700, color: c.textHeading, fontVariantNumeric: "tabular-nums" });

export const stepTotal = style({ fontSize: 11.5, fontWeight: 500, color: c.textMuted });

export const dateText = style({ fontSize: 12, color: c.textSecondary, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });

export const elapsed = styleVariants({
  today: { fontSize: 12, fontWeight: 600, color: c.textMuted, whiteSpace: "nowrap" },
  overdue: { fontSize: 12, fontWeight: 800, color: c.accentWarningActive, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});
