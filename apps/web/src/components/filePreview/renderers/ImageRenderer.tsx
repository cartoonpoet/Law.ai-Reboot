import { useFilePreviewUrl } from "../useFilePreviewUrl";
import * as css from "../filePreview.css";

interface ImageRendererProps {
  fileId: string;
  fileName: string;
}

/**
 * 이미지(png/jpg) 미리보기 — presigned URL 을 <img src> 로 그대로 사용.
 * CORS 는 단순 GET 이라 별 이슈 없음(R2 GET 도 같은 origin allow 가정).
 */
export function ImageRenderer({ fileId, fileName }: ImageRendererProps) {
  const { data, isLoading, error } = useFilePreviewUrl(fileId);

  if (isLoading) return <div className={css.placeholder}>이미지 불러오는 중…</div>;
  if (error || !data)
    return (
      <div className={css.placeholder}>
        이미지를 불러올 수 없습니다 (URL 발급 실패).
      </div>
    );

  return <img className={css.image} src={data.url} alt={fileName} />;
}
