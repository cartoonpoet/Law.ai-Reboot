import { useState } from "react";
import { diffLines } from "diff";
import type { PreviewFileRef } from "./FilePreviewModal";
import { useFileText } from "./useFileText";

interface UseDownloadChangeReportResult {
  download: () => Promise<void>;
  isReady: boolean;
  isDownloading: boolean;
  error: string | null;
}

/**
 * 두 파일의 평문 diff 를 PDF 로 묶어 다운로드.
 *
 * - 텍스트는 useFileText(react-query 캐시)로 가져와 모달의 DiffView 와 공유 → 추가 추출 X.
 * - @react-pdf/renderer 의 pdf() 는 무거우니 동적 import (다운로드 클릭 시점에 lazy).
 * - 부분 실패(텍스트 추출 안 됨) 면 download 비활성(isReady=false) → 호출자는 버튼 disable.
 */
export const useDownloadChangeReport = (
  fileA: PreviewFileRef | null,
  fileB: PreviewFileRef | null,
): UseDownloadChangeReportResult => {
  const aText = useFileText(
    fileA?.id ?? null,
    fileA?.mimeType ?? null,
    fileA?.name ?? "",
  );
  const bText = useFileText(
    fileB?.id ?? null,
    fileB?.mimeType ?? null,
    fileB?.name ?? "",
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = Boolean(
    fileA && fileB && aText.data && bText.data && !aText.error && !bText.error,
  );

  const download = async (): Promise<void> => {
    if (!fileA || !fileB || !aText.data || !bText.data) return;
    setIsDownloading(true);
    setError(null);
    try {
      const parts = diffLines(aText.data, bText.data);
      const [{ pdf }, { ChangeReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ChangeReport"),
      ]);
      const blob = await pdf(
        <ChangeReport
          fileA={fileA}
          fileB={fileB}
          parts={parts}
          generatedAt={new Date().toISOString()}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileA.name}_vs_${fileB.name}_변경보고서.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 생성 실패");
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isReady, isDownloading, error };
};
