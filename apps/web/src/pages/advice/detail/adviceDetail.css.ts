import { globalStyle, style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* =========================================================================
 * 법률자문 상세 — 계약 상세(contractDetail.css) 카드·요약줄 위에 얹는 자문 전용 부품.
 * themeVars + color-mix 파생만 사용(로컬 hex 0).
 * ======================================================================= */

const c = themeVars.color;

const HEADING = c.textHeading;
const BODY = c.textSecondary;
const MUTED = c.textMuted;
const FAINT = c.textDisabled;
const SURFACE = c.neutralSurface;
const SURFACE_ALT = c.neutralSurfaceAlt;
const BORDER = c.neutralBorder;
const BORDER_SUBTLE = `color-mix(in srgb, ${c.neutralBorder} 50%, transparent)`;
const PRIMARY = c.accentPrimary;
const INFO = c.accentInfo;
const WARNING_DARK = c.accentWarningActive;

/* ── 요약줄 보조 ── */

export const glanceValueRow = style({ display: "flex", alignItems: "center", gap: 8 });

export const glanceSub = style({ fontSize: 12, fontWeight: 500, color: MUTED });

/* ── 요청 내용 ── */

export const tagRow = style({ display: "flex", flexWrap: "wrap", gap: 6 });

// 에디터 HTML — 문단 간격만 정리한다.
export const richText = style({ fontSize: 13, lineHeight: 1.7, color: BODY, wordBreak: "break-word" });

globalStyle(`${richText} p`, { margin: "0 0 6px" });
globalStyle(`${richText} p:last-child`, { marginBottom: 0 });
globalStyle(`${richText} ul, ${richText} ol`, { margin: "0 0 6px", paddingLeft: 20 });
globalStyle(`${richText} h1, ${richText} h2, ${richText} h3, ${richText} h4`, {
  margin: "8px 0 4px",
  fontSize: 14,
  fontWeight: 700,
  color: HEADING,
});

/* ── 질의 · 회신 스레드 ── */

export const emptyThread = style({ margin: 0, fontSize: 12.5, color: MUTED });

export const thread = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

export const message = style({ display: "flex", gap: 10, alignItems: "flex-start" });

export const messageMain = style({ flex: 1, minWidth: 0 });

export const messageHead = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  marginBottom: 6,
});

export const messageAuthor = style({ fontSize: 13, fontWeight: 700, color: HEADING });

export const messageDept = style({ fontSize: 12, color: MUTED });

export const messageTime = style({
  marginLeft: "auto",
  fontSize: 11.5,
  color: FAINT,
  fontVariantNumeric: "tabular-nums",
});

const kindBase = {
  fontSize: 10.5,
  fontWeight: 700,
  borderRadius: themeVars.radius.sm,
  padding: "1px 7px",
  lineHeight: 1.6,
} as const;

export type ThreadSideTypes = "requester" | "legal";

export const messageKind = styleVariants<Record<ThreadSideTypes, typeof kindBase & { color: string; background: string }>>({
  requester: { ...kindBase, color: PRIMARY, background: `color-mix(in srgb, ${PRIMARY} 10%, ${SURFACE})` },
  legal: { ...kindBase, color: INFO, background: `color-mix(in srgb, ${INFO} 12%, ${SURFACE})` },
});

const bubbleBase = {
  borderRadius: themeVars.radius.lg,
  padding: "11px 13px",
  fontSize: 13,
  lineHeight: 1.65,
  color: BODY,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
} as const;

export const bubble = styleVariants({
  requester: { ...bubbleBase, background: SURFACE_ALT, border: `1px solid ${BORDER}` },
  legal: {
    ...bubbleBase,
    background: `color-mix(in srgb, ${INFO} 6%, ${SURFACE})`,
    border: `1px solid color-mix(in srgb, ${INFO} 18%, ${SURFACE})`,
  },
});

// 공개 전 회신 표시(결재 중·결재 반려).
export const messageState = styleVariants({
  pendingApproval: { ...kindBase, color: WARNING_DARK, background: `color-mix(in srgb, ${c.accentWarning} 14%, ${SURFACE})` },
  rejected: { ...kindBase, color: c.accentDanger, background: `color-mix(in srgb, ${c.accentDanger} 10%, ${SURFACE})` },
});

export const bubbleRejected = style({ opacity: 0.6 });

export const waiting = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 18,
  padding: "9px 12px",
  borderRadius: themeVars.radius.md,
  background: SURFACE_ALT,
  fontSize: 12.5,
  color: MUTED,
});

export const waitingIcon = style({ width: 14, height: 14, color: WARNING_DARK, flexShrink: 0 });

export const waitingStrong = style({ color: HEADING, fontWeight: 700 });

export const composer = style({
  marginTop: 16,
  paddingTop: 16,
  borderTop: `1px solid ${BORDER_SUBTLE}`,
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const composerActions = style({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 });

export const composerHint = style({ marginRight: "auto", fontSize: 11.5, color: FAINT });

/* ── 처리 현황(우측 레일) ── */

export const kvList = style({ margin: 0, display: "flex", flexDirection: "column" });

export const kvRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "9px 0",
  borderBottom: `1px solid ${BORDER_SUBTLE}`,
  selectors: {
    "&:first-child": { paddingTop: 0 },
    "&:last-child": { borderBottom: "none" },
  },
});

export const kvKey = style({ fontSize: 12.5, color: MUTED });

export const kvValue = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 600,
  color: HEADING,
  textAlign: "right",
});

export const kvValueMuted = style({ color: MUTED, fontWeight: 500 });

export const panelBody = style({ display: "flex", flexDirection: "column", gap: 14 });

/* ── 첨부 ── */

export const fileList = style({ display: "flex", flexDirection: "column", gap: 6 });

export const fileUpload = style({ marginTop: 12 });

export const fileError = style({ margin: "8px 0 0", fontSize: 12, color: c.accentDanger });
