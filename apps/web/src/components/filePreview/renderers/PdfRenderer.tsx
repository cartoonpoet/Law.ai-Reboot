import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@lawkit/ui";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
// Vite — ?url import 로 워커 파일을 별도 청크로 emit 한 뒤 그 URL 을 pdf.js 에 알려준다.
// (new URL(..., import.meta.url) 패턴은 vite 가 빌드 타임 해석을 못 해 warn + 깨질 위험)
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useFilePreviewUrl } from "../useFilePreviewUrl";
import * as css from "../filePreview.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfRendererProps {
  fileId: string;
  // 좌우 비교에서 가로 폭을 컬럼 기준으로 줄이기 위함. 기본 720.
  width?: number;
}

/**
 * PDF 단일 페이지 뷰 + 이전/다음 컨트롤.
 *
 * - 페이지 단위 렌더(react-pdf <Page>). 줌은 width prop 으로 단계 제어.
 * - file 은 {url} 형태로 전달해야 hook 의존성·CORS 가 깔끔.
 * - 좌우 비교에서 같은 fileId 가 등장하면 useFilePreviewUrl 캐시가 단일 요청으로 공유.
 */
export function PdfRenderer({ fileId, width = 720 }: PdfRendererProps) {
  const { data, isLoading, error } = useFilePreviewUrl(fileId);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNum, setPageNum] = useState<number>(1);

  if (isLoading) return <div className={css.placeholder}>PDF 불러오는 중…</div>;
  if (error || !data)
    return (
      <div className={css.placeholder}>
        PDF 를 불러올 수 없습니다 (URL 발급 실패).
      </div>
    );

  return (
    <div>
      <Document
        file={data.url}
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n);
          setPageNum((p) => Math.min(p, n));
        }}
        onLoadError={() => setNumPages(0)}
        loading={<div className={css.placeholder}>PDF 파싱 중…</div>}
        error={<div className={css.placeholder}>PDF 를 열 수 없습니다.</div>}
      >
        <div className={css.docPage}>
          <Page pageNumber={pageNum} width={width} />
        </div>
      </Document>
      {numPages > 1 && (
        <div className={css.toolbar}>
          <span>
            <Button
              size="small"
              variant="outline"
              disabled={pageNum <= 1}
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            >
              ◀
            </Button>{" "}
            {pageNum} / {numPages}{" "}
            <Button
              size="small"
              variant="outline"
              disabled={pageNum >= numPages}
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            >
              ▶
            </Button>
          </span>
        </div>
      )}
    </div>
  );
}
