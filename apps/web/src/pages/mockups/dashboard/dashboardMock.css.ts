import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;
const NARROW = "screen and (max-width: 1100px)";

// AI 보조 표식 — themeVars 에 AI 전용 색이 없어 info(청록)에서 파생한다. 모든 시안에서 같은 톤으로 "AI 가 붙인 것"을 구분.
const AI_TEXT = c.accentInfoActive;
const AI_TINT = `color-mix(in srgb, ${c.accentInfo} 10%, ${c.neutralSurface})`;
const AI_BORDER = `color-mix(in srgb, ${c.accentInfo} 35%, ${c.neutralSurface})`;

/* --- 시안 페이지 --- */
export const page = style({ display: "flex", flexDirection: "column", gap: 16 });

export const controls = style({
  padding: "14px 16px",
  background: c.neutralSurface,
  border: `1px dashed ${c.neutralBorder}`,
  borderRadius: 8,
});

/* --- 공통: 대시보드 머리 --- */
export const header = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  paddingBottom: 14,
  borderBottom: `1px solid ${c.neutralBorder}`,
});

export const eyebrow = style({ fontSize: 12, fontWeight: 600, color: c.textMuted });
export const title = style({ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: c.textHeading, letterSpacing: "-0.02em" });

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const rail = style({ display: "flex", flexDirection: "column", gap: 16 });

/* --- 클릭 가능한 통계 칸(필터) --- */
export const statButton = style({
  cursor: "pointer",
  outline: "none",
  borderRadius: 8,
  selectors: { "&:focus-visible": { boxShadow: themeVars.shadow.focus } },
});

/* --- 할 일 행 --- */
export const taskMain = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });

export const taskTitle = style({
  fontSize: 13.5,
  fontWeight: 700,
  color: c.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const taskSub = style({ fontSize: 12, color: c.textMuted });
export const nowrap = style({ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });
export const trailing = style({ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 });

/* --- AI 보조 --- */
export const aiNote = style({
  display: "inline-flex",
  alignItems: "flex-start",
  alignSelf: "flex-start",
  gap: 5,
  marginTop: 3,
  padding: "3px 8px",
  borderRadius: 6,
  background: AI_TINT,
  color: AI_TEXT,
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: "100%",
});

export const aiIcon = style({ flexShrink: 0, marginTop: 2, width: 13, height: 13, color: AI_TEXT });

export const aiPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 18,
  borderRadius: 10,
  border: `1px solid ${AI_BORDER}`,
  background: `linear-gradient(180deg, ${c.neutralSurface}, ${AI_TINT})`,
});

export const aiPanelHead = style({ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: c.textHeading });
export const aiPanelIcon = style({ width: 18, height: 18, color: AI_TEXT });

/* --- B. 코파일럿 --- */
export const promptForm = style({ display: "flex", gap: 8, width: "100%" });
export const promptInput = style({ flex: 1, minWidth: 0 });
export const chipRow = style({ display: "flex", flexWrap: "wrap", gap: 6 });
export const chip = style({ cursor: "pointer" });

export const answer = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 8,
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
});

export const answerText = style({ margin: 0, fontSize: 14, lineHeight: 1.65, color: c.textHeading });

/* --- C. 트리아지 --- */
export const laneGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  alignItems: "start",
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const laneBody = style({ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px 16px" });
export const laneDesc = style({ margin: 0, fontSize: 12, color: c.textMuted });

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "12px 14px",
  borderRadius: 8,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurface,
});

export const cardFoot = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 });

/* --- D. 리스크 레이더 --- */
export const widgetBody = style({ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px 16px" });
export const sectionLabel = style({ fontSize: 12, fontWeight: 700, color: c.textMuted });

/* --- E. 데일리 플랜 --- */
export const suggestionList = style({
  margin: 0,
  padding: "14px 16px 16px 34px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  lineHeight: 1.6,
  color: c.textSecondary,
});

/* --- 오른쪽 레일 행(일정·공지) — LDS ListGroupItem 본문이 줄어들지 않아 폭을 직접 제한해 말줄임 --- */
export const railTitle = style({
  display: "block",
  maxWidth: 180,
  fontSize: 13,
  fontWeight: 600,
  color: c.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const scheduleDate = style({
  fontSize: 12,
  fontWeight: 700,
  color: c.textMuted,
  fontVariantNumeric: "tabular-nums",
  minWidth: 36,
});

export const noticeDate = style({ fontSize: 11.5, color: c.textMuted, fontVariantNumeric: "tabular-nums" });

export const emptyText = style({ padding: "20px 0", textAlign: "center", fontSize: 12.5, color: c.textMuted });

/* --- G. 항상 떠 있는 AI 비서 --- */
export const controlRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" });

export const fab = style({
  position: "fixed",
  right: 28,
  bottom: 28,
  zIndex: 900,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 48,
  padding: "0 18px 0 14px",
  border: "none",
  borderRadius: 999,
  background: AI_TEXT,
  color: c.textInverse,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  boxShadow: themeVars.shadow.modal,
  cursor: "pointer",
  selectors: { "&:focus-visible": { outline: "none", boxShadow: `${themeVars.shadow.modal}, ${themeVars.shadow.focus}` } },
});

export const fabIcon = style({ width: 18, height: 18, color: c.textInverse });

// 최신 메시지가 항상 아래에 보이도록 column-reverse(스크롤 동기화 effect 없이 하단 고정)
export const chatLog = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: 8,
  maxHeight: 280,
  overflowY: "auto",
  paddingBottom: 4,
});

const bubbleBase = style({ maxWidth: "88%", padding: "8px 11px", borderRadius: 10, fontSize: 13, lineHeight: 1.55 });

export const bubble = {
  user: style([bubbleBase, { alignSelf: "flex-end", background: c.accentPrimary, color: c.textInverse, borderBottomRightRadius: 3 }]),
  assistant: style([bubbleBase, { alignSelf: "flex-start", background: AI_TINT, color: c.textHeading, borderBottomLeftRadius: 3 }]),
};

export const chatContext = style({ fontSize: 11.5, color: c.textMuted });
export const dockBody = style({ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 });
