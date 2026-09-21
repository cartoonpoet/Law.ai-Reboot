/**
 * 잰 블록 높이로 "몇 번째 블록 앞에서 장을 넘겨야 하는지" 계산하는 순수 함수.
 * DOM 도 ProseMirror 도 모르기 때문에 그대로 테스트할 수 있다(측정은 pageLayoutExtension 이 맡는다).
 */

/** 화면에서 잰 최상위 블록 하나. top/height 는 자동 나눔이 없다고 쳤을 때의 값(빈칸은 빼고 잰다). */
export interface MeasuredBlockTypes {
  /** ProseMirror 문서에서 이 블록이 시작하는 자리 */
  pos: number;
  /** 종이 글 영역 맨 위에서 이 블록까지의 거리(px) */
  top: number;
  /** 블록 자체 높이(px) */
  height: number;
  /** 사용자가 넣은 "페이지 나누기" 블록인지 */
  isManualBreak: boolean;
}

/** 장이 넘어가는 자리 한 곳. */
export interface PageBreakTypes {
  /** 이 자리(블록) 앞에서 장이 넘어간다 */
  pos: number;
  /** 장을 넘기기 전에 채워 넣을 빈칸 높이(px) — 이만큼 밀어야 앞 장이 A4 한 장으로 꽉 찬다 */
  fillHeight: number;
  /** 이 자리부터 시작되는 장 번호(2장이면 2) */
  pageNo: number;
  /** 사용자가 넣은 "페이지 나누기" 때문에 넘어가는 자리인지 */
  isManual: boolean;
}

/** 페이지 나눔 결과. */
export interface PagePlanTypes {
  breaks: PageBreakTypes[];
  /** 전체 장 수 */
  pageCount: number;
  /** 마지막 장에 남은 빈칸 높이(px) */
  tailHeight: number;
}

/** 소수점 오차로 장이 잘못 넘어가지 않게 두는 여유(px). */
const SLACK = 1;

export const EMPTY_PAGE_PLAN: PagePlanTypes = { breaks: [], pageCount: 1, tailHeight: 0 };

/** 0 아래로 내려가지 않는 정수 px. */
const getFillPx = (value: number): number => Math.max(0, Math.round(value));

/**
 * 블록 높이 목록 → 페이지 나눔 계획.
 *
 * - 한 장에 들어가는 높이(contentHeight)를 넘기는 블록이 나오면 그 블록 **앞에서** 장을 넘긴다.
 *   블록 자체를 자르지 않으므로 표·그림이 경계에 걸려도 깨지지 않는다.
 * - 한 블록이 통째로 한 장보다 크면(아주 긴 표 등) 그 블록은 자르지 않고 그대로 흘려보낸다.
 * - 사용자가 넣은 "페이지 나누기"는 자리가 남아 있어도 무조건 장을 넘긴다.
 */
export const computePageBreaks = (blocks: MeasuredBlockTypes[], contentHeight: number): PagePlanTypes => {
  if (contentHeight <= 0 || blocks.length === 0) return EMPTY_PAGE_PLAN;

  const breaks: PageBreakTypes[] = [];
  // 지금 장의 글이 시작하는 자리와, 마지막 블록의 아래쪽.
  let pageTop = blocks[0].top;
  let lastBottom = pageTop;
  let pageNo = 1;

  // 넘어가는 자리까지 이 장이 쓴 높이 — 블록 사이 여백까지 포함되도록 "넘어갈 블록의 위쪽"으로 잰다.
  const getFillHeight = (breakTop: number): number => getFillPx(contentHeight - (breakTop - pageTop));

  blocks.forEach((block) => {
    if (block.isManualBreak) {
      pageNo += 1;
      breaks.push({ pos: block.pos, fillHeight: getFillHeight(block.top), pageNo, isManual: true });
      // 다음 장의 글은 나누기 표시(아래 여백 + 회색 틈 + 위 여백) 다음부터 시작한다.
      pageTop = block.top + block.height;
      lastBottom = pageTop;
      return;
    }

    const bottom = block.top + block.height;
    const isPageStarted = block.top > pageTop + SLACK;
    if (isPageStarted && bottom - pageTop > contentHeight + SLACK) {
      pageNo += 1;
      breaks.push({ pos: block.pos, fillHeight: getFillHeight(block.top), pageNo, isManual: false });
      pageTop = block.top;
    }
    lastBottom = bottom;
  });

  return { breaks, pageCount: pageNo, tailHeight: getFillPx(contentHeight - (lastBottom - pageTop)) };
};

/** 두 계획이 사실상 같은지 — 같으면 화면을 다시 그리지 않는다(재측정 되돌이 방지). */
export const checkIsSamePagePlan = (a: PagePlanTypes, b: PagePlanTypes): boolean =>
  a.pageCount === b.pageCount &&
  a.tailHeight === b.tailHeight &&
  a.breaks.length === b.breaks.length &&
  a.breaks.every((pageBreak, i) => {
    const other = b.breaks[i];
    return (
      pageBreak.pos === other.pos &&
      pageBreak.pageNo === other.pageNo &&
      pageBreak.isManual === other.isManual &&
      pageBreak.fillHeight === other.fillHeight
    );
  });
