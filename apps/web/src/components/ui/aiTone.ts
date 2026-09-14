import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

// AI 보조 표식 — themeVars 에 AI 전용 색이 없어 info(청록)에서 파생. "AI 가 붙인 것"(판단·준비물·AI 비서)만 이 톤을 쓴다.
export const AI_TEXT = c.accentInfoActive;
export const AI_TINT = `color-mix(in srgb, ${c.accentInfo} 10%, ${c.neutralSurface})`;
export const AI_BORDER = `color-mix(in srgb, ${c.accentInfo} 35%, ${c.neutralSurface})`;
export const AI_GRADIENT = `linear-gradient(150deg, ${AI_TEXT}, color-mix(in srgb, ${AI_TEXT} 60%, ${c.accentPrimary}))`;
