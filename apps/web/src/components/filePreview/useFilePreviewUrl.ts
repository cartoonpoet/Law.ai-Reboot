import { useQuery } from "@tanstack/react-query";
import { getDownloadUrl } from "../../api/files";

// presigned URL 은 단기 만료(보통 수 분). 5분 캐시면 같은 모달 안 비교/리렌더 동안 재요청 X.
const STALE_MS = 5 * 60 * 1000;

/**
 * R2 presigned GET URL 조회 — react-query 캐싱.
 *
 * 같은 fileId 를 좌(A) 와 우(B) 양쪽에서 동시에 보면 단일 요청으로 공유한다.
 * presigned URL 은 TTL 이 짧아 staleTime 을 보수적으로 잡되, fileId 가 바뀌면 즉시 재요청.
 */
export const useFilePreviewUrl = (fileId: string | null) =>
  useQuery({
    queryKey: ["file-preview-url", fileId],
    queryFn: () => getDownloadUrl(fileId!),
    enabled: Boolean(fileId),
    staleTime: STALE_MS,
    retry: 1,
  });
