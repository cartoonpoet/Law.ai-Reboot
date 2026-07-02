import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/**
 * 멘션 칩 식별 DOM 클래스 — MentionEditor의 Mention 노드 HTMLAttributes.class와 1:1 공유.
 * sanitize·표시·에디터 내부 강조 셀렉터가 모두 이 상수를 참조한다(드리프트 방지).
 *
 * P2 직렬화 규약은 class에 의존하지 않고 `data-mention` 속성으로 식별한다 — 본 클래스는 보조
 * 셀렉터이자 에디터 내부 강조용. (DOMPurify 환경에서 class가 떨어져도 data-mention만 보존되면
 * commentItem.css.ts의 `[data-mention]` 셀렉터가 강조를 적용한다.)
 */
export const MENTION_CLASS = "lawai-mention";

const surface = themeVars.color.neutralSurface;
const border = themeVars.color.neutralBorder;
const accent = themeVars.color.accentPrimary;

/* suggestion 드롭다운 — useMentionSuggestion의 MentionList가 포털로 마운트해 사용. */
export const dropdown = style({
  position: "fixed",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 200,
  maxWidth: 320,
  maxHeight: 240,
  overflowY: "auto",
  padding: 6,
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 10,
  boxShadow: `0 8px 24px color-mix(in srgb, ${themeVars.color.textHeading} 12%, transparent)`,
});

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "left",
  color: themeVars.color.textHeading,
  background: "transparent",
  selectors: {
    "&[data-active='true']": {
      background: `color-mix(in srgb, ${accent} 12%, ${surface})`,
      color: accent,
    },
    "&:hover": {
      background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
    },
  },
});

export const optionDept = style({
  marginLeft: "auto",
  fontSize: 11.5,
  fontWeight: 500,
  color: themeVars.color.textMuted,
});

export const empty = style({
  padding: "10px",
  textAlign: "center",
  fontSize: 12.5,
  color: themeVars.color.textMuted,
});
