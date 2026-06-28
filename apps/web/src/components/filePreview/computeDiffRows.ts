import { diffLines, diffWordsWithSpace, type Change } from "diff";

export type SpanKind = "add" | "remove" | "context";

export interface DiffSpan {
  kind: SpanKind;
  text: string;
}

export type DiffRow =
  | { kind: "context"; text: string }
  | { kind: "add"; text: string }
  | { kind: "remove"; text: string }
  // 인접한 (remove, add) 1줄씩이 한 쌍을 이룰 때 — intra-line word diff.
  // removed 라인은 paired-remove 스팬으로(추가된 단어는 누락), added 라인은 paired-add 스팬으로(삭제된 단어 누락).
  | { kind: "paired-remove"; spans: DiffSpan[] }
  | { kind: "paired-add"; spans: DiffSpan[] };

export interface DiffSummary {
  added: number;
  removed: number;
}

// Change.value 를 줄 단위로 분해 — 끝 개행으로 인한 빈 라인은 제거.
const explodeLines = (value: string): string[] => {
  const lines = value.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

const intraLineSpans = (
  removed: string,
  added: string,
): { removedSpans: DiffSpan[]; addedSpans: DiffSpan[] } => {
  const wordParts = diffWordsWithSpace(removed, added);
  const removedSpans: DiffSpan[] = [];
  const addedSpans: DiffSpan[] = [];
  for (const wp of wordParts) {
    if (wp.added) {
      addedSpans.push({ kind: "add", text: wp.value });
    } else if (wp.removed) {
      removedSpans.push({ kind: "remove", text: wp.value });
    } else {
      removedSpans.push({ kind: "context", text: wp.value });
      addedSpans.push({ kind: "context", text: wp.value });
    }
  }
  return { removedSpans, addedSpans };
};

/**
 * Change[] (line-level) → DiffRow[].
 *
 * - 각 part 를 줄 단위로 explode.
 * - 결과 스트림에서 (remove 줄 1개, add 줄 1개) 가 인접하면 intra-line word diff 로 변환 →
 *   사용자가 "어떤 단어가 바뀌었는지" 한눈에 봄. 한국어는 어절 단위로 보여 가독성 ↑.
 * - 그 외(연속 remove 만, 연속 add 만, context) 는 줄 단위 그대로.
 */
export const partsToRows = (parts: Change[]): DiffRow[] => {
  // 1) 줄 단위로 explode
  const linear: { kind: SpanKind; text: string }[] = [];
  for (const p of parts) {
    const kind: SpanKind = p.added ? "add" : p.removed ? "remove" : "context";
    for (const line of explodeLines(p.value)) {
      linear.push({ kind, text: line });
    }
  }

  // 2) 인접 (remove, add) 페어 → intra-line word diff
  const rows: DiffRow[] = [];
  for (let i = 0; i < linear.length; i++) {
    const cur = linear[i];
    const next = linear[i + 1];
    if (cur.kind === "remove" && next?.kind === "add") {
      const { removedSpans, addedSpans } = intraLineSpans(cur.text, next.text);
      rows.push({ kind: "paired-remove", spans: removedSpans });
      rows.push({ kind: "paired-add", spans: addedSpans });
      i++; // skip next
    } else {
      rows.push({ kind: cur.kind, text: cur.text });
    }
  }
  return rows;
};

/**
 * 두 텍스트의 변경 요약 — diffLines 의 count(=라인 수) 합산. parts 를 한 번 더 만들지 않게
 * 호출자가 이미 가진 parts 를 넘기도록 한다.
 */
export const summarizeParts = (parts: Change[]): DiffSummary => ({
  added: parts.filter((p) => p.added).reduce((n, p) => n + (p.count ?? 0), 0),
  removed: parts.filter((p) => p.removed).reduce((n, p) => n + (p.count ?? 0), 0),
});

/**
 * 편의 함수 — 두 텍스트를 받아 rows + summary 까지 한 번에.
 *
 * 입력 끝 개행이 한 쪽만 있으면 jsdiff 가 마지막 줄을 다른 토큰("X\\n" vs "X")으로 보고 통째
 * 제거+추가로 잡는다. 양쪽에 \\n 을 보장해 토큰 정합성을 맞춘다.
 */
const ensureTrailingNewline = (s: string): string =>
  s.endsWith("\n") ? s : `${s}\n`;

export const computeDiff = (
  a: string,
  b: string,
): { rows: DiffRow[]; summary: DiffSummary } => {
  const parts = diffLines(
    ensureTrailingNewline(a),
    ensureTrailingNewline(b),
    { newlineIsToken: false },
  );
  return { rows: partsToRows(parts), summary: summarizeParts(parts) };
};
