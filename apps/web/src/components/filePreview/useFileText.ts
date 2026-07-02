import { useQuery } from "@tanstack/react-query";
import { extractText } from "./extract/extractText";
import { useFilePreviewUrl } from "./useFilePreviewUrl";

// 5분 — presigned URL TTL 과 보조 맞춤.
const STALE_MS = 5 * 60 * 1000;

/**
 * 파일의 추출된 평문을 react-query 로 캐싱.
 *
 * - presigned URL 도 useFilePreviewUrl 캐시 공유 → 같은 fileId 가 diff 와 좌우 양쪽에서 동시에 떠도
 *   네트워크/추출은 각 1회.
 * - mimeType + fileName 으로 추출기 결정 (extractText 내부 디스패치).
 */
export const useFileText = (
  fileId: string | null,
  mimeType: string | null,
  fileName: string,
) => {
  const url = useFilePreviewUrl(fileId);
  return useQuery({
    queryKey: ["file-text", fileId, mimeType, fileName, url.data?.url],
    queryFn: () => extractText(url.data!.url, mimeType, fileName),
    enabled: Boolean(fileId && url.data?.url),
    staleTime: STALE_MS,
    retry: 1,
  });
};
