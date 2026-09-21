import { describe, it, expect } from "vitest";
import { checkIsSamePagePlan, computePageBreaks, type MeasuredBlockTypes } from "./computePageBreaks";

/** 한 장에 들어가는 높이 — 테스트는 읽기 쉽게 1000px 로 잡는다. */
const CONTENT = 1000;

/** 위에서부터 차곡차곡 쌓인 블록 목록을 만든다(사이 여백 없음). */
const stack = (heights: number[], manualAt: number[] = []): MeasuredBlockTypes[] => {
  let top = 0;
  return heights.map((height, i) => {
    const block = { pos: i, top, height, isManualBreak: manualAt.includes(i) };
    top += height;
    return block;
  });
};

describe("computePageBreaks", () => {
  it("한 장에 다 들어가면 나누지 않고, 남은 높이를 마지막 장 빈칸으로 돌려준다", () => {
    const plan = computePageBreaks(stack([200, 300]), CONTENT);
    expect(plan.breaks).toHaveLength(0);
    expect(plan.pageCount).toBe(1);
    expect(plan.tailHeight).toBe(500);
  });

  it("A4 한 장을 넘기는 블록이 나오면 그 블록 앞에서 장을 넘긴다", () => {
    const plan = computePageBreaks(stack([600, 300, 400]), CONTENT);
    expect(plan.pageCount).toBe(2);
    expect(plan.breaks).toEqual([{ pos: 2, fillHeight: 100, pageNo: 2, isManual: false }]);
    // 2장에는 400 만 들어갔으니 600 이 남는다.
    expect(plan.tailHeight).toBe(600);
  });

  it("블록을 자르지 않는다 — 딱 맞게 끝나면 장을 넘기지 않는다", () => {
    const plan = computePageBreaks(stack([500, 500]), CONTENT);
    expect(plan.breaks).toHaveLength(0);
    expect(plan.pageCount).toBe(1);
    expect(plan.tailHeight).toBe(0);
  });

  it("한 블록이 한 장보다 커도 그 앞에서는 나누지 않는다(표·그림이 깨지지 않게)", () => {
    const plan = computePageBreaks(stack([1500]), CONTENT);
    expect(plan.breaks).toHaveLength(0);
    expect(plan.pageCount).toBe(1);
  });

  it("한 장을 넘는 표 다음 블록부터 새 장으로 넘긴다", () => {
    const plan = computePageBreaks(stack([1500, 200]), CONTENT);
    expect(plan.pageCount).toBe(2);
    expect(plan.breaks[0]).toMatchObject({ pos: 1, pageNo: 2, isManual: false });
    // 넘친 블록이 이미 한 장을 다 먹었으므로 채울 빈칸은 없다.
    expect(plan.breaks[0].fillHeight).toBe(0);
  });

  it("수동 페이지 나누기는 자리가 남아 있어도 그 자리에서 장을 넘긴다", () => {
    const blocks = stack([200, 40, 300], [1]);
    const plan = computePageBreaks(blocks, CONTENT);
    expect(plan.pageCount).toBe(2);
    expect(plan.breaks).toEqual([{ pos: 1, fillHeight: 800, pageNo: 2, isManual: true }]);
    expect(plan.tailHeight).toBe(700);
  });

  it("수동·자동이 섞여도 장 번호가 1씩 올라간다", () => {
    // 200 + 수동나누기 + 600 + 600(넘침) → 1장 / 2장 / 3장
    const blocks = stack([200, 40, 600, 600], [1]);
    const plan = computePageBreaks(blocks, CONTENT);
    expect(plan.pageCount).toBe(3);
    expect(plan.breaks.map((brk) => [brk.pageNo, brk.isManual])).toEqual([
      [2, true],
      [3, false],
    ]);
  });

  it("문단 사이 여백까지 빈칸 계산에 넣는다 — 앞 장이 A4 한 장으로 딱 맞게 끝나야 한다", () => {
    // 600 + 여백 20 + 500(넘침) → 넘어갈 블록의 위쪽(620)까지가 1장이 쓴 높이다.
    const blocks: MeasuredBlockTypes[] = [
      { pos: 0, top: 0, height: 600, isManualBreak: false },
      { pos: 1, top: 620, height: 500, isManualBreak: false },
    ];
    expect(computePageBreaks(blocks, CONTENT).breaks[0].fillHeight).toBe(380);
  });

  it("내용이 없으면 1장으로 본다", () => {
    expect(computePageBreaks([], CONTENT).pageCount).toBe(1);
  });
});

describe("checkIsSamePagePlan", () => {
  const plan = computePageBreaks(stack([600, 300, 400]), CONTENT);

  it("같은 계획이면 true — 다시 그리지 않는다", () => {
    expect(checkIsSamePagePlan(plan, computePageBreaks(stack([600, 300, 400]), CONTENT))).toBe(true);
  });

  it("빈칸 높이가 달라지면 false — 다시 그린다", () => {
    expect(checkIsSamePagePlan(plan, computePageBreaks(stack([600, 250, 400]), CONTENT))).toBe(false);
  });
});
