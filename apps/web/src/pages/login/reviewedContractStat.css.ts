import { keyframes, style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

// 로그인 브랜드 패널(네이비 배경)의 "지금까지 검토된 계약" 줄 — 패널의 T 토큰 규칙을 따른다.
const pulse = keyframes({ "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.35 } });

// lp-rise 등장 순서(제목 다음) — 기존 인라인 animationDelay 를 옮겼다.
export const row = style({ display: "flex", alignItems: "baseline", gap: 7, marginTop: 16, animationDelay: ".18s" });

export const label = style({ fontSize: 12.5, color: T.navyText });

export const count = style({
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
});

export const live = style({ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 2, fontSize: 11 });

export const liveDot = style({
  width: 5,
  height: 5,
  borderRadius: 999,
  background: T.success,
  animation: `${pulse} 1.8s ease-in-out infinite`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
