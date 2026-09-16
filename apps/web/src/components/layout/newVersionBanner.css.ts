import { keyframes, style } from "@vanilla-extract/css";
import { themeVars as c } from "@lawkit/ui";

// 아래에서 살짝 떠오르며 나타난다. 움직임을 줄이도록 설정한 사용자에게는 애니메이션을 끈다.
const slideUp = keyframes({
  from: { opacity: 0, transform: "translate(-50%, 12px)" },
  to: { opacity: 1, transform: "translate(-50%, 0)" },
});

// 하단 중앙 알약 — 작업을 가리지 않으면서 눈에 띄는 자리.
// zIndex 는 사이드바/탑바(30~31) 위, portal 모달(40+) 아래. AI 비서 런처는 우측 하단이라 겹치지 않는다.
export const wrap = style({
  position: "fixed",
  left: "50%",
  bottom: 20,
  transform: "translateX(-50%)",
  zIndex: 35,
  display: "flex",
  alignItems: "center",
  gap: 10,
  maxWidth: "calc(100vw - 32px)",
  padding: "6px 6px 6px 14px",
  borderRadius: 999,
  background: c.color.neutralSurface,
  border: `1px solid ${c.color.neutralBorder}`,
  boxShadow: "0 6px 18px rgba(17, 21, 42, 0.14)",
  animation: `${slideUp} 240ms ease-out`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const dot = style({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: c.color.accentPrimary,
  flexShrink: 0,
});

export const text = style({
  fontSize: 12.5,
  fontWeight: 600,
  color: c.color.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const button = style({
  flexShrink: 0,
  border: "none",
  borderRadius: 999,
  padding: "5px 12px",
  background: c.color.accentPrimary,
  color: c.color.textInverse,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  selectors: { "&:hover": { filter: "brightness(1.08)" } },
});
