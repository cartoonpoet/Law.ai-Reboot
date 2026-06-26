import { style, globalStyle } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { MENTION_CLASS } from "../../../components/ui/MentionEditor.css";
import { row as rowSelector } from "./commentPanel.css";

/**
 * 코멘트 아이템 스타일 — 시안(comment-section-mockup.html) `.cmt` 룩 매핑.
 * 본문은 sanitize HTML을 `dangerouslySetInnerHTML`로 렌더하므로 인라인 노드 스타일은
 * globalStyle로 토큰을 적용한다(인라인 0 유지).
 */

const accent = themeVars.color.accentPrimary;
const accentActive = themeVars.color.accentPrimaryActive;
const info = themeVars.color.accentInfo;
const danger = themeVars.color.accentDanger;
const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;
const heading = themeVars.color.textHeading;
const muted = themeVars.color.textMuted;
const faint = themeVars.color.textDisabled;

/* "(수정됨)" 표기 */
export const edited = style({
  fontSize: 11,
  color: muted,
  fontStyle: "italic",
});

/* 본인 코멘트 hover 액션 슬롯 — 시안 `.cmtactions`: opacity 0 → row hover 시 1. */
export const actions = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginLeft: "auto",
  opacity: 0,
  transition: "opacity .12s",
});

/* row hover 시 액션 노출(컨테이너 셀렉터 — commentPanel.css.ts `row` 클래스 의존). */
globalStyle(`${rowSelector}:hover ${actions}`, { opacity: 1 });

/* miniact 버튼 — 시안 .miniact: 작은 dashed pill, hover 시 실선 + primary. */
export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 9px",
  borderRadius: themeVars.radius.md,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  color: muted,
  background: surface,
  border: `1px dashed ${border}`,
  fontFamily: "inherit",
  transition: "border-color .12s, color .12s, border-style .12s",
  selectors: {
    "&:hover": {
      borderStyle: "solid",
      borderColor: accent,
      color: accentActive,
    },
  },
});

/* 삭제 버튼 hover — danger 톤. */
export const dangerButton = style({
  selectors: {
    "&:hover": {
      borderColor: danger,
      color: danger,
    },
  },
});

/* 삭제된 코멘트 placeholder — 시안 `.deleted .bubble`: 점선·이탤릭·휴지통 아이콘. */
export const deletedBubble = style({
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12.5,
  lineHeight: 1.6,
  fontStyle: "italic",
  color: faint,
  background: "transparent",
  border: `1px dashed ${border}`,
  borderRadius: themeVars.radius.lg,
  padding: "10px 13px",
});

/* 인라인 편집 폼 */
export const editForm = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const editActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
});

export const editError = style({
  fontSize: 12,
  fontWeight: 600,
  color: danger,
});

/* 역할 칩 — 시안 `.roletag` 작은 pill(font 10.5, padding 1×7). */
export const roleTag = style({
  fontSize: 10.5,
  fontWeight: 700,
  borderRadius: themeVars.radius.sm,
  padding: "1px 7px",
  lineHeight: 1.6,
  whiteSpace: "nowrap",
});

/* 요청자 — primary tint. */
export const roleRequester = style({
  background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
  color: accentActive,
});

/* 법무팀 — info tint. */
export const roleLegal = style({
  background: `color-mix(in srgb, ${info} 12%, ${surface})`,
  color: info,
});

/* 시스템 — neutral. */
export const roleSystem = style({
  background: surfaceAlt,
  color: muted,
});

/* sanitize HTML 콘텐츠 렌더 영역 — 본문 노드 스타일은 globalStyle로(인라인 0). */
export const content = style({
  fontSize: 13,
  lineHeight: 1.65,
  color: themeVars.color.textSecondary,
});

/* 본문 바깥 말풍선 — 시안 `.bubble` 기본 톤. */
export const bubble = style({
  background: surfaceAlt,
  border: `1px solid ${border}`,
  borderRadius: themeVars.radius.lg,
  padding: "11px 13px",
  fontSize: 13,
  lineHeight: 1.65,
  color: themeVars.color.textSecondary,
  wordBreak: "break-word",
});

/* 본인 코멘트 — 시안 `.bubble.own`: primary tint. */
export const bubbleOwn = style({
  background: `color-mix(in srgb, ${accent} 6%, ${surface})`,
  borderColor: `color-mix(in srgb, ${accent} 14%, ${surface})`,
});

/* 시스템 메시지(role==='system') — 차분 톤. 시안 슬롯만 준비(statepill 데이터원 없음). */
export const bubbleSystem = style({
  background: "transparent",
  border: "none",
  padding: "2px 0",
  fontSize: 12.5,
  color: muted,
});

/* 본문 안 멘션 강조 — sanitize가 보존한 `<span data-mention>`을 globalStyle로 강조(인라인 0).
   class 도 함께 셀렉터로 OR 매칭해 에디터/표시 양쪽 호환. */
globalStyle(`${content} span[data-mention], ${content} span.${MENTION_CLASS}, ${bubble} span[data-mention], ${bubble} span.${MENTION_CLASS}`, {
  fontWeight: 700,
  color: accentActive,
  background: `color-mix(in srgb, ${accent} 10%, ${surface})`,
  borderRadius: themeVars.radius.sm,
  padding: "1px 5px",
  whiteSpace: "nowrap",
});

/* 본문 표시 영역 — sanitize HTML 노드 스타일(시안 `.bubble` 자식). */
globalStyle(`${bubble} p`, { margin: "0 0 8px" });
globalStyle(`${bubble} p:last-child`, { marginBottom: 0 });
globalStyle(`${bubble} strong`, { fontWeight: 700, color: heading });
globalStyle(`${bubble} em`, { fontStyle: "italic" });
globalStyle(`${bubble} h4`, { margin: "10px 0 4px", fontSize: 13.5, fontWeight: 700, color: heading });
globalStyle(`${bubble} ul, ${bubble} ol`, { margin: "4px 0 8px", paddingLeft: 20 });
globalStyle(`${bubble} li`, { margin: "2px 0" });
globalStyle(`${bubble} a`, { color: accent, textDecoration: "underline" });
globalStyle(`${bubble} blockquote`, {
  margin: "6px 0",
  padding: "4px 12px",
  borderLeft: `3px solid color-mix(in srgb, ${accent} 40%, ${surface})`,
  background: `color-mix(in srgb, ${accent} 6%, ${surface})`,
  borderRadius: `0 ${themeVars.radius.sm} ${themeVars.radius.sm} 0`,
});
