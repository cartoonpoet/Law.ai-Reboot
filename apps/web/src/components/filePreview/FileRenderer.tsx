import { lazy, Suspense } from "react";
import { pickRenderer } from "./pickRenderer";
import { UnsupportedRenderer } from "./renderers/UnsupportedRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import * as css from "./filePreview.css";

// react-pdf + mammoth 는 번들 큼 → lazy 로 단일/비교 모달이 열렸을 때만 다운로드.
const PdfRenderer = lazy(async () => ({
  default: (await import("./renderers/PdfRenderer")).PdfRenderer,
}));
const DocxRenderer = lazy(async () => ({
  default: (await import("./renderers/DocxRenderer")).DocxRenderer,
}));

interface FileRendererProps {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  // 비교 모드 컬럼 폭 — PDF 가 width 로 줌 제어할 때 활용.
  width?: number;
}

/**
 * 파일 한 개를 렌더 — 파일 타입 분기는 pickRenderer 단일 출처.
 *
 * lazy + Suspense 로 PDF/DOCX 청크는 최초 1회만 받아 캐시. 같은 모달 안에서
 * 좌(A) 우(B) 가 다른 타입이어도 OK — 두 청크가 병렬 로드된 뒤 캐시 공유.
 */
export function FileRenderer({
  fileId,
  fileName,
  mimeType,
  width,
}: FileRendererProps) {
  const kind = pickRenderer(mimeType, fileName);

  return (
    <Suspense fallback={<div className={css.placeholder}>렌더러 로딩 중…</div>}>
      {kind === "pdf" && <PdfRenderer fileId={fileId} width={width} />}
      {kind === "image" && (
        <ImageRenderer fileId={fileId} fileName={fileName} />
      )}
      {kind === "docx" && <DocxRenderer fileId={fileId} />}
      {kind === "unsupported" && (
        <UnsupportedRenderer fileId={fileId} fileName={fileName} />
      )}
    </Suspense>
  );
}
