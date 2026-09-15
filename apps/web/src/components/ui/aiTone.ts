import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

// AI 보조 표식 — "AI 가 붙인 것"(브리핑·판단 한 줄·AI 비서)만 이 색을 쓴다.
// 서비스 기본 파랑과 확실히 구분되도록 보라 계열. themeVars 에 AI 전용 색이 아직 없어 파랑과 빨강을 섞어 만든다
// (LDS 에 AI 색 토큰이 생기면 이 파일만 토큰으로 바꾸면 된다).
const AI_BASE = `color-mix(in srgb, ${c.accentPrimary} 62%, ${c.accentDanger})`;

export const AI_TEXT = `color-mix(in srgb, ${c.accentPrimaryActive} 60%, ${c.accentDangerActive})`;
export const AI_TINT = `color-mix(in srgb, ${AI_BASE} 9%, ${c.neutralSurface})`;
export const AI_BORDER = `color-mix(in srgb, ${AI_BASE} 30%, ${c.neutralSurface})`;
export const AI_GRADIENT = `linear-gradient(150deg, ${AI_TEXT}, ${AI_BASE})`;
