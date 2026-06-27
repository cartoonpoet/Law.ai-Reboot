import { style } from "@vanilla-extract/css";

// 상단 고정 배너 — 모든 라우트 위에 떠 있도록 zIndex 높게(모달은 더 위).
// 사이드바/탑바 zIndex 30~31 위, portal 모달(보통 40+) 아래.
export const wrap = style({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 35,
  padding: 8,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
});

export const inner = style({
  pointerEvents: "auto",
  width: "100%",
  maxWidth: 720,
});
