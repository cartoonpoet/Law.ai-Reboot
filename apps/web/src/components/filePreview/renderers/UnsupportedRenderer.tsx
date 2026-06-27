import { Button } from "@lawkit/ui";
import { getDownloadUrl } from "../../../api/files";
import * as css from "../filePreview.css";

interface UnsupportedRendererProps {
  fileId: string;
  fileName: string;
}

/**
 * HWP/HWPX/기타 미지원 포맷 — 다운로드만 안내.
 *
 * (presigned URL 은 클릭 시점에 1회 받아 새 탭으로 연다 — 다른 렌더러와 정책 동일.)
 */
export function UnsupportedRenderer({ fileId, fileName }: UnsupportedRendererProps) {
  const handleDownload = async () => {
    try {
      const { url } = await getDownloadUrl(fileId);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "다운로드 URL 발급 실패",
      );
    }
  };

  return (
    <div className={css.placeholder}>
      <div className={css.placeholderTitle}>{fileName}</div>
      <div>이 포맷은 미리보기를 지원하지 않습니다 (HWP/기타).</div>
      <Button size="small" variant="outline" onClick={handleDownload}>
        ⬇ 다운로드
      </Button>
    </div>
  );
}
