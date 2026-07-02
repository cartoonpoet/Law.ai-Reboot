import { describe, it, expect } from "vitest";
import { computeDiff, partsToRows, summarizeParts } from "./computeDiffRows";
import { diffLines } from "diff";

describe("computeDiffRows", () => {
  it("동일 텍스트는 context row 만, summary 0/0", () => {
    const { rows, summary } = computeDiff("가\n나", "가\n나");
    expect(summary).toEqual({ added: 0, removed: 0 });
    expect(rows.every((r) => r.kind === "context")).toBe(true);
  });

  it("순수 추가는 add row 로, 순수 삭제는 remove row 로", () => {
    const a = computeDiff("X", "X\nY");
    expect(a.rows.find((r) => r.kind === "add")).toEqual({
      kind: "add",
      text: "Y",
    });
    const b = computeDiff("X\nY", "X");
    expect(b.rows.find((r) => r.kind === "remove")).toEqual({
      kind: "remove",
      text: "Y",
    });
  });

  it("인접 remove+add 1쌍은 paired 로 묶이고 spans 에 word-level 강조가 들어간다", () => {
    const before =
      "본 계약의 유효기간은 체결일로부터 6개월로 한다.\n공통 라인";
    const after =
      "본 계약의 유효기간은 체결일로부터 1년으로 한다.\n공통 라인";
    const { rows } = computeDiff(before, after);
    const pairedRemove = rows.find((r) => r.kind === "paired-remove");
    const pairedAdd = rows.find((r) => r.kind === "paired-add");
    expect(pairedRemove).toBeDefined();
    expect(pairedAdd).toBeDefined();
    if (pairedRemove?.kind !== "paired-remove") throw new Error("type");
    if (pairedAdd?.kind !== "paired-add") throw new Error("type");

    // removed 줄 = context "본 계약의 ... 체결일로부터 " + remove "6개월로 " + context "한다."
    // 정확한 토큰 분해는 jsdiff 가 결정하지만 공통 prefix/suffix 는 context 로 분리돼야 한다.
    expect(pairedRemove.spans.some((s) => s.kind === "context")).toBe(true);
    expect(pairedRemove.spans.some((s) => s.kind === "remove")).toBe(true);
    expect(pairedRemove.spans.every((s) => s.kind !== "add")).toBe(true);

    expect(pairedAdd.spans.some((s) => s.kind === "context")).toBe(true);
    expect(pairedAdd.spans.some((s) => s.kind === "add")).toBe(true);
    expect(pairedAdd.spans.every((s) => s.kind !== "remove")).toBe(true);
  });

  it("연속 remove (페어 안 됨) 는 remove row 가 여러 개로 유지", () => {
    const before = "A\nB\nC";
    const after = "A";
    const { rows } = computeDiff(before, after);
    const removed = rows.filter((r) => r.kind === "remove");
    expect(removed).toHaveLength(2);
  });

  it("summarizeParts 는 추가/삭제 라인 수 합", () => {
    const parts = diffLines("A\nB\nC", "A\nX\nY\nZ");
    const s = summarizeParts(parts);
    expect(s.added).toBeGreaterThan(0);
    expect(s.removed).toBeGreaterThan(0);
  });

  it("partsToRows 는 빈 끝 라인을 만들지 않는다", () => {
    const parts = diffLines("A\n", "A\nB\n");
    const rows = partsToRows(parts);
    // empty trailing row 가 있으면 안 됨
    for (const r of rows) {
      if (r.kind === "context" || r.kind === "add" || r.kind === "remove") {
        expect(r.text).not.toBe("");
      }
    }
  });
});
