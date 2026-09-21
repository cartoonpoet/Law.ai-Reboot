import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import {
  PAGE_FILL_VAR,
  PAGE_GAP_HEIGHT,
  PAGE_PADDING_X,
  PAGE_PADDING_Y,
  PAGE_SPLIT_HEIGHT,
} from "./pageMetrics";

const c = themeVars.color;

/** 장이 넘어가는 자리에 채워 넣는 빈칸 높이 — 플러그인이 잰 값을 이 변수로 넣는다. */
const FILL = `var(${PAGE_FILL_VAR}, 0px)`;

/**
 * 장과 장 사이 — 앞 장에 남은 빈칸 + 앞 장 아래 여백 + 회색 틈 + 다음 장 위 여백.
 * 자동으로 나뉜 자리(위젯 div)와 사용자가 넣은 "페이지 나누기" 블록이 똑같이 쓴다.
 */
export const pageSplitRule = {
  position: "relative",
  height: `calc(${FILL} + ${PAGE_SPLIT_HEIGHT}px)`,
  // 테두리는 아래 회색 틈(::before)이 그린다 — 다른 화면용 점선 스타일이 묻어 오지 않게 지운다.
  border: "none",
  // 종이 좌우 여백 밖까지 번지게 해서 종이 폭 전체가 끊어진 것처럼 보이게 한다.
  margin: `0 -${PAGE_PADDING_X}px`,
  userSelect: "none",
} as const;

/** 회색 틈 — 두 장의 종이 사이. 위아래 안쪽 그림자로 종이 끝처럼 보이게 한다. */
export const pageSplitBandRule = {
  content: '""',
  position: "absolute",
  left: 0,
  right: 0,
  top: `calc(${FILL} + ${PAGE_PADDING_Y}px)`,
  height: PAGE_GAP_HEIGHT,
  background: c.neutralBackground,
  borderTop: `1px solid ${c.neutralBorder}`,
  borderBottom: `1px solid ${c.neutralBorder}`,
  boxShadow:
    "inset 0 8px 10px -10px color-mix(in srgb, #000 22%, transparent), inset 0 -8px 10px -10px color-mix(in srgb, #000 22%, transparent)",
} as const;

/**
 * 회색 틈 가운데에 뜨는 "N페이지" 배지 — 번호는 플러그인이 data-page-label 로 넣는다.
 * 번호가 아직 없는 동안(측정 전)에는 배지를 그리지 않도록 셀렉터에서 [data-page-label] 을 요구한다 —
 * 빈 알약이 잠깐 보이는 일을 막는다.
 */
export const pageSplitBadgeRule = {
  content: "attr(data-page-label)",
  position: "absolute",
  left: "50%",
  top: `calc(${FILL} + ${PAGE_PADDING_Y}px + ${PAGE_GAP_HEIGHT / 2}px)`,
  transform: "translate(-50%, -50%)",
  padding: "2px 10px",
  borderRadius: 999,
  background: c.neutralSurface,
  border: `1px solid ${c.neutralBorder}`,
  color: c.textMuted,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
} as const;

/** 내용이 A4 한 장을 넘겨 자동으로 나뉜 자리(ProseMirror 위젯 — 문서에는 남지 않는다). */
export const autoPageSplit = style({
  ...pageSplitRule,
  selectors: {
    "&::before": { ...pageSplitBandRule },
    "&[data-page-label]::after": { ...pageSplitBadgeRule },
  },
});
