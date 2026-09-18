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

export const grow = style({ flex: 1, minWidth: 0 });

// 카드 제목 — 누르면 문서로 간다(버튼이지만 본문 글자처럼 보이게).
export const cardTitle = style({
  padding: 0,
  border: "none",
  background: "none",
  fontSize: 14.5,
  fontWeight: 700,
  color: c.textHeading,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": { textDecoration: "underline" },
    "&:focus-visible": { outline: "none", boxShadow: themeVars.shadow.focus },
  },
});

export const cardTitleDeleted = style([cardTitle, { color: c.textDisabled, textDecoration: "line-through", cursor: "default" }]);

export const meta = style({ fontSize: 12, color: c.textMuted });

export const metaCode = style({ fontSize: 12, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const pager = style({ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 });

export const empty = style({ padding: "48px 0", textAlign: "center", fontSize: 13, color: c.textMuted });

export const modalDoc = style({ margin: 0, fontSize: 13, fontWeight: 700, color: c.textHeading });
