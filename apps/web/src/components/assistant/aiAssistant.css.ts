import { keyframes, style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import { AI_BORDER, AI_GRADIENT, AI_TEXT, AI_TINT } from "../ui/aiTone";

const c = themeVars.color;
const FAINT = c.neutralBorderStrong;

/* --- 항상 떠 있는 AI 비서 (채널톡 스타일) --- */
const panelIn = keyframes({ from: { opacity: 0, transform: "translateY(16px) scale(.96)" }, to: { opacity: 1, transform: "none" } });
const popIn = keyframes({ from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } });
const MOBILE = "screen and (max-width: 480px)";

const resetButton = style({ border: "none", background: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" });

export const launcher = style({
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 960,
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "none",
  background: AI_GRADIENT,
  color: c.textInverse,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: themeVars.shadow.modal,
  cursor: "pointer",
  transition: "transform .15s ease",
  selectors: {
    "&:hover": { transform: "scale(1.06)" },
    "&:focus-visible": { outline: "none", boxShadow: `${themeVars.shadow.modal}, ${themeVars.shadow.focus}` },
  },
});

// 모바일에선 패널이 화면을 덮으므로 열려 있는 동안 런처를 숨긴다(입력창 보내기 버튼을 가리지 않게).
export const launcherOpen = style({ "@media": { [MOBILE]: { display: "none" } } });

export const launcherIcon = style({ width: 26, height: 26, color: c.textInverse });

export const unreadBadge = style({
  position: "absolute",
  top: -2,
  right: -2,
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 10,
  background: c.accentDanger,
  color: c.textInverse,
  fontSize: 11,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `2px solid ${c.neutralSurface}`,
});

/* 런처 위 먼저 말 거는 말풍선 */
export const popup = style({
  position: "fixed",
  right: 24,
  bottom: 96,
  zIndex: 950,
  width: 300,
  background: c.neutralSurface,
  borderRadius: 16,
  boxShadow: themeVars.shadow.modal,
  animation: `${popIn} .3s ease-out both`,
});

export const popupBody = style([resetButton, { display: "flex", flexDirection: "column", gap: 6, width: "100%", padding: "14px 16px" }]);
export const popupHead = style({ display: "flex", alignItems: "center", gap: 8 });
export const popupName = style({ fontSize: 12.5, fontWeight: 700, color: c.textHeading });
export const popupTime = style({ fontSize: 11, color: FAINT });
export const popupText = style({ fontSize: 13.5, lineHeight: 1.5, color: c.textHeading, paddingRight: 12 });

export const popupClose = style([
  resetButton,
  { position: "absolute", top: -8, left: -8, width: 24, height: 24, borderRadius: "50%", background: c.neutralSurface, boxShadow: themeVars.shadow.raised, display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted },
]);

export const botAvatar = style({
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: AI_GRADIENT,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const botAvatarLarge = style([botAvatar, { width: 40, height: 40 }]);
export const botAvatarIcon = style({ width: 14, height: 14, color: c.textInverse });

/* 패널 */
export const panel = style({
  position: "fixed",
  right: 24,
  bottom: 96,
  zIndex: 955,
  width: 380,
  height: "min(640px, calc(100vh - 120px))",
  background: c.neutralSurfaceAlt,
  borderRadius: 20,
  boxShadow: themeVars.shadow.modal,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  transformOrigin: "bottom right",
  animation: `${panelIn} .22s ease-out both`,
  "@media": { [MOBILE]: { inset: 0, width: "auto", height: "auto", borderRadius: 0 } },
});

/* 홈 */
export const homeScroll = style({ flex: 1, overflowY: "auto" });
export const homeHero = style({ padding: "20px 20px 60px", background: AI_GRADIENT, color: c.textInverse });
export const heroTop = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });
export const heroBrand = style({ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" });
export const heroClose = style([resetButton, { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: c.textInverse }]);
export const heroTitle = style({ margin: "22px 0 0", fontSize: 22, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.02em" });

export const homeCards = style({ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px", marginTop: -40 });

export const homeCard = style({
  background: c.neutralSurface,
  borderRadius: 14,
  boxShadow: themeVars.shadow.raised,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const homeCardTitle = style({ fontSize: 14, fontWeight: 700, color: c.textHeading });
export const operatorRow = style({ display: "flex", alignItems: "center", gap: 10 });
export const operatorText = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });
export const operatorName = style({ fontSize: 13.5, fontWeight: 700, color: c.textHeading });
export const statusText = style({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: c.textMuted });
export const onlineDot = style({ width: 7, height: 7, borderRadius: "50%", background: c.accentSuccess, flexShrink: 0 });

export const startButton = style([
  resetButton,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    background: AI_TEXT,
    color: c.textInverse,
    fontSize: 14,
    fontWeight: 700,
    selectors: { "&:hover": { filter: "brightness(1.08)" } },
  },
]);

export const startIcon = style({ width: 14, height: 14, color: c.textInverse });

export const quickRow = style([
  resetButton,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 0",
    borderTop: `1px solid ${c.neutralBorder}`,
    fontSize: 13.5,
    color: c.textHeading,
    selectors: { "&:first-child": { borderTop: "none", paddingTop: 0 }, "&:hover": { color: AI_TEXT } },
  },
]);

export const quickIcon = style({ width: 12, height: 12, color: FAINT });
export const recentRow = style([resetButton, { display: "flex", alignItems: "center", gap: 10, width: "100%" }]);
export const recentMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 });
export const recentPreview = style({ fontSize: 12.5, color: c.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
export const recentTime = style({ fontSize: 11, color: FAINT, flexShrink: 0 });

export const bottomNav = style({ display: "grid", gridTemplateColumns: "1fr 1fr", background: c.neutralSurface, borderTop: `1px solid ${c.neutralBorder}` });
export const navButton = style([resetButton, { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0 10px", fontSize: 11, color: c.textMuted }]);
export const navActive = style({ color: AI_TEXT, fontWeight: 700 });

/* 대화 */
export const chatHeader = style({ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px", background: c.neutralSurface, borderBottom: `1px solid ${c.neutralBorder}` });
export const iconButton = style([resetButton, { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted, selectors: { "&:hover": { background: c.neutralSurfaceAlt } } }]);
export const headerMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 });

export const chatBody = style({ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column-reverse", padding: "12px 16px" });
export const chatInner = style({ display: "flex", flexDirection: "column", gap: 14 });
export const dateDivider = style({ alignSelf: "center", fontSize: 11, color: FAINT, padding: "2px 10px", borderRadius: 999, background: c.neutralSurface });

export const msgRow = style({ display: "flex", alignItems: "flex-start", gap: 8, animation: `${popIn} .25s ease-out both` });
export const msgMain = style({ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" });
export const msgMeta = style({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: FAINT });
export const msgName = style({ fontWeight: 700, color: c.textMuted });

export const bubbleBot = style({
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  borderRadius: "4px 16px 16px 16px",
  padding: "9px 12px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: c.textHeading,
  whiteSpace: "pre-wrap",
});

export const userRow = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, animation: `${popIn} .2s ease-out both` });

export const bubbleUser = style({
  maxWidth: "80%",
  background: c.accentPrimary,
  color: c.textInverse,
  borderRadius: "16px 4px 16px 16px",
  padding: "9px 12px",
  fontSize: 13.5,
  lineHeight: 1.55,
});

export const quickReplies = style({ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 36 });

export const quickReply = style([
  resetButton,
  {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${AI_BORDER}`,
    background: c.neutralSurface,
    color: AI_TEXT,
    fontSize: 12.5,
    fontWeight: 600,
    selectors: { "&:hover": { background: AI_TINT } },
  },
]);

export const composer = style({ padding: "10px 12px 10px", background: c.neutralSurface, borderTop: `1px solid ${c.neutralBorder}` });

export const composerBox = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 4px 4px 14px",
  borderRadius: 22,
  border: `1px solid ${c.neutralBorder}`,
  background: c.neutralSurfaceAlt,
  selectors: { "&:focus-within": { borderColor: AI_TEXT, background: c.neutralSurface } },
});

export const composerInput = style({
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  font: "inherit",
  fontSize: 13.5,
  color: c.textHeading,
  height: 32,
});

export const sendButton = style([resetButton, { width: 32, height: 32, borderRadius: "50%", background: AI_TEXT, display: "flex", alignItems: "center", justifyContent: "center" }]);
export const sendIcon = style({ width: 14, height: 14, color: c.textInverse });
export const composerHint = style({ marginTop: 6, textAlign: "center", fontSize: 10.5, color: FAINT });
