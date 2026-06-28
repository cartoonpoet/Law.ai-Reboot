import { useMemo } from "react";
import { diffLines } from "diff";
import { useFileText } from "./useFileText";
import type { PreviewFileRef } from "./FilePreviewModal";
import * as css from "./filePreview.css";

interface DiffViewProps {
  fileA: PreviewFileRef;
  fileB: PreviewFileRef;
}

/**
 * 두 파일의 평문 diff 를 보여준다 (jsdiff `diffLines`, unified 스타일).
 *
 * - 두 파일 텍스트는 useFileText 가 react-query 로 캐싱 — diff 모드와 좌우 모드 사이를 토글해도 재추출 X.
 * - 라인 단위 비교가 1차. 단어 단위 강조(diffWordsWithSpace) 는 후속 — 한국어는 공백 토큰화가 거칠어
 *   라인 + 인접 컨텍스트 위주가 일단 더 안정적.
 */
export function DiffView({ fileA, fileB }: DiffViewProps) {
  const a = useFileText(fileA.id, fileA.mimeType, fileA.name);
  const b = useFileText(fileB.id, fileB.mimeType, fileB.name);

  const parts = useMemo(() => {
    if (!a.data || !b.data) return null;
    return diffLines(a.data, b.data, { newlineIsToken: false });
  }, [a.data, b.data]);

  const isLoading = a.isLoading || b.isLoading;
  const isError = a.error || b.error;

  if (isLoading) {
    return <div className={css.diffEmpty}>텍스트 추출 중…</div>;
  }
  if (isError || !parts) {
    return (
      <div className={css.diffEmpty}>
        텍스트를 추출하지 못했습니다. 스캔 PDF 등 OCR 미지원 파일일 수 있어요.
      </div>
    );
  }

  // 변경 요약 — added/removed value 의 라인 수 합. context 는 제외.
  const added = parts
    .filter((p) => p.added)
    .reduce((n, p) => n + (p.count ?? 0), 0);
  const removed = parts
    .filter((p) => p.removed)
    .reduce((n, p) => n + (p.count ?? 0), 0);

  if (added === 0 && removed === 0) {
    return (
      <>
        <div className={css.diffSummary}>
          <span className={css.diffSummaryItem}>두 파일의 텍스트가 동일합니다.</span>
        </div>
        <div className={css.diffWrap}>
          {parts.map((p, i) => renderPart(p, i))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={css.diffSummary}>
        <span className={css.diffSummaryItem}>+ 추가 {added} 라인</span>
        <span className={css.diffSummaryItem}>− 삭제 {removed} 라인</span>
      </div>
      <div className={css.diffWrap}>
        {parts.map((p, i) => renderPart(p, i))}
      </div>
    </>
  );
}

const renderPart = (
  part: { value: string; added?: boolean; removed?: boolean; count?: number },
  index: number,
) => {
  const sign = part.added ? "+" : part.removed ? "−" : " ";
  const rowClass = part.added
    ? `${css.diffRow} ${css.diffRowAdd}`
    : part.removed
      ? `${css.diffRow} ${css.diffRowRemove}`
      : `${css.diffRow} ${css.diffRowContext}`;

  // 한 part 가 여러 라인일 수 있어 라인 단위로 쪼개 한 줄씩 렌더 — 한 줄 단위 색상이 깔끔.
  // 마지막 빈 라인(끝 개행) 은 skip 해서 빈 행이 생기지 않게.
  const lines = part.value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();

  return (
    <div key={`${index}-${part.added ? "a" : part.removed ? "r" : "c"}`}>
      {lines.map((line, j) => (
        <div key={j} className={rowClass}>
          <span className={css.diffSign}>{sign}</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
};
