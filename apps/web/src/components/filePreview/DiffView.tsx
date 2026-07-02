import { useMemo } from "react";
import { useFileText } from "./useFileText";
import {
  computeDiff,
  type DiffRow,
  type DiffSpan,
} from "./computeDiffRows";
import type { PreviewFileRef } from "./FilePreviewModal";
import * as css from "./filePreview.css";

interface DiffViewProps {
  fileA: PreviewFileRef;
  fileB: PreviewFileRef;
}

/**
 * 두 파일의 평문 diff (jsdiff `diffLines` + 인접 -/+ 페어는 `diffWordsWithSpace` 로 intra-line 강조).
 *
 * - useFileText 가 react-query 로 텍스트 캐싱 → 좌우 ↔ diff 모드 토글해도 재추출 X.
 * - 한국어 계약서처럼 한 줄에서 단어 몇 개만 바뀌는 케이스는 paired 라인으로 바뀐 어절만 강조해
 *   사용자가 "어디가 바뀌었는지" 즉시 식별 가능.
 */
export function DiffView({ fileA, fileB }: DiffViewProps) {
  const a = useFileText(fileA.id, fileA.mimeType, fileA.name);
  const b = useFileText(fileB.id, fileB.mimeType, fileB.name);

  const result = useMemo(() => {
    if (!a.data || !b.data) return null;
    return computeDiff(a.data, b.data);
  }, [a.data, b.data]);

  if (a.isLoading || b.isLoading) {
    return <div className={css.diffEmpty}>텍스트 추출 중…</div>;
  }
  if (a.error || b.error || !result) {
    return (
      <div className={css.diffEmpty}>
        텍스트를 추출하지 못했습니다. 스캔 PDF 등 OCR 미지원 파일일 수 있어요.
      </div>
    );
  }

  const { rows, summary } = result;

  if (summary.added === 0 && summary.removed === 0) {
    return (
      <>
        <div className={css.diffSummary}>
          <span className={css.diffSummaryItem}>두 파일의 텍스트가 동일합니다.</span>
        </div>
        <div className={css.diffWrap}>{rows.map((r, i) => renderRow(r, i))}</div>
      </>
    );
  }

  return (
    <>
      <div className={css.diffSummary}>
        <span className={css.diffSummaryItem}>+ 추가 {summary.added} 라인</span>
        <span className={css.diffSummaryItem}>− 삭제 {summary.removed} 라인</span>
      </div>
      <div className={css.diffWrap}>{rows.map((r, i) => renderRow(r, i))}</div>
    </>
  );
}

const renderRow = (row: DiffRow, key: number) => {
  if (row.kind === "context") {
    return (
      <div key={key} className={`${css.diffRow} ${css.diffRowContext}`}>
        <span className={css.diffSign}> </span>
        <span>{row.text || " "}</span>
      </div>
    );
  }
  if (row.kind === "add") {
    return (
      <div key={key} className={`${css.diffRow} ${css.diffRowAdd}`}>
        <span className={css.diffSign}>+</span>
        <span>{row.text || " "}</span>
      </div>
    );
  }
  if (row.kind === "remove") {
    return (
      <div key={key} className={`${css.diffRow} ${css.diffRowRemove}`}>
        <span className={css.diffSign}>−</span>
        <span>{row.text || " "}</span>
      </div>
    );
  }
  if (row.kind === "paired-remove") {
    return (
      <div key={key} className={`${css.diffRow} ${css.diffRowPairedRemove}`}>
        <span className={css.diffSign}>−</span>
        <span>{row.spans.map((s, i) => renderSpan(s, i))}</span>
      </div>
    );
  }
  // paired-add
  return (
    <div key={key} className={`${css.diffRow} ${css.diffRowPairedAdd}`}>
      <span className={css.diffSign}>+</span>
      <span>{row.spans.map((s, i) => renderSpan(s, i))}</span>
    </div>
  );
};

const renderSpan = (span: DiffSpan, key: number) => {
  if (span.kind === "add") {
    return (
      <span key={key} className={css.diffSpanAdd}>
        {span.text}
      </span>
    );
  }
  if (span.kind === "remove") {
    return (
      <span key={key} className={css.diffSpanRemove}>
        {span.text}
      </span>
    );
  }
  return <span key={key}>{span.text}</span>;
};
