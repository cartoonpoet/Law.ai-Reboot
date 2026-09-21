/**
 * 문서 편집기 종이(A4) 치수 — 화면 스타일(*.css.ts)과 자동 페이지 나눔 계산(ProseMirror 플러그인)이
 * 같은 숫자를 봐야 하므로 한 곳에 모아 둔다. 여기 값을 고치면 종이 모양과 나눔 위치가 함께 바뀐다.
 *
 * 폭 748px 을 A4(210×297mm) 가로로 잡으면 세로는 748 × 297 / 210 ≒ 1058px 이다.
 */

/** 종이 한 장의 가로 */
export const PAGE_WIDTH = 748;

/** 종이 한 장의 세로(A4 비율) */
export const PAGE_HEIGHT = 1058;

/** 종이 좌우 여백 */
export const PAGE_PADDING_X = 66;

/** 종이 위아래 여백 */
export const PAGE_PADDING_Y = 62;

/** 장과 장 사이 회색 틈(여백은 따로 그린다) */
export const PAGE_GAP_HEIGHT = 44;

/** 한 장에 들어가는 내용 높이 — 넘치면 다음 장으로 넘긴다. */
export const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;

/** 장이 넘어갈 때 화면에서 차지하는 높이 — 아래 여백 + 회색 틈 + 다음 장 위 여백. */
export const PAGE_SPLIT_HEIGHT = PAGE_PADDING_Y * 2 + PAGE_GAP_HEIGHT;

/**
 * 장을 넘기기 전에 남은 빈칸 높이를 담는 CSS 변수.
 * 값은 글이 얼마나 찼는지에 따라 달라지는 "잰 값"이라 플러그인이 DOM 에 넣고,
 * 색·여백 같은 디자인 값은 전부 *.css.ts 에 둔다.
 */
export const PAGE_FILL_VAR = "--doc-page-fill";

/** 마지막 장의 남은 빈칸 높이를 담는 CSS 변수 — 마지막 장도 A4 한 장으로 꽉 차 보이게 한다. */
export const PAGE_TAIL_VAR = "--doc-page-tail";
