import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const surface = themeVars.color.neutralSurface;
const surfaceAlt = themeVars.color.neutralSurfaceAlt;
const border = themeVars.color.neutralBorder;

/* 검색 입력 + 결과 리스트 세로 배치 */
export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});

export const searchRow = style({ flexShrink: 0 });

export const peopleScroll = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  maxHeight: 320,
  minHeight: 0,
  overflowY: "auto",
  border: `1px solid ${border}`,
  borderRadius: 10,
  padding: 6,
  background: surfaceAlt,
});

export const personRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 10px",
  borderRadius: 9,
  cursor: "pointer",
  transition: "background-color 120ms ease",
  selectors: { "&:hover": { background: surface } },
});

export const personRowOn = style({
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 12%, ${surface})`,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 16%, ${surface})`,
    },
  },
});

export const personMain = style({ flex: 1, minWidth: 0 });
export const personName = style({
  fontSize: 13,
  fontWeight: 600,
  color: themeVars.color.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const personCheck = style({
  color: themeVars.color.accentPrimary,
  display: "inline-flex",
  flexShrink: 0,
});

export const empty = style({
  padding: "24px 10px",
  textAlign: "center",
  fontSize: 12.5,
  color: themeVars.color.textMuted,
});

/* 선택된 담당자 미리보기 */
export const selectedRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${themeVars.color.accentPrimary}`,
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 8%, ${surface})`,
  flexShrink: 0,
});
export const selectedLabel = style({
  fontSize: 11,
  fontWeight: 600,
  color: themeVars.color.textMuted,
  flexShrink: 0,
});
export const selectedName = style({
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 700,
  color: themeVars.color.textHeading,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/* 푸터 */
export const footRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  width: "100%",
  gap: 8,
});
