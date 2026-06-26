import type {
  ConfirmUploadRequest,
  FileAttachmentDto,
  PresignUploadRequest,
  PresignUploadResponse,
} from "@lawai/contracts";
import { apiFetch, getApiBaseUrl } from "./client";

// presign — 클라이언트가 SubtleCrypto 로 sha256 계산 후 호출.
export const presignFile = (
  req: Omit<PresignUploadRequest, "viewerId">,
): Promise<PresignUploadResponse> =>
  apiFetch<PresignUploadResponse>("/files/presign", {
    method: "POST",
    body: JSON.stringify(req),
  });

// confirm — R2 PUT 후 ETag 와 함께. 응답은 FileAttachmentDto(id 로 createComment 시 attachmentIds 전달).
export const confirmFile = (
  req: Omit<ConfirmUploadRequest, "viewerId">,
): Promise<FileAttachmentDto> =>
  apiFetch<FileAttachmentDto>("/files/confirm", {
    method: "POST",
    body: JSON.stringify(req),
  });

// 다운로드는 gateway 가 302 리다이렉트 → 새 탭 a 태그 href 로 호출.
// JWT 가 헤더 기반이라 새 탭 클릭만으로는 인증되지 않으므로, 클릭 시 fetch 로 url 만 받아 window.open.
export const getDownloadUrl = async (
  fileId: string,
): Promise<{ url: string }> => {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${getApiBaseUrl()}/files/${fileId}/download`, {
    method: "GET",
    redirect: "manual",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  // 302 의 location 헤더는 보통 브라우저가 가린다(opaqueredirect). 그래서 백엔드가
  // 302 대신 200 + JSON 으로 응답하면 더 단순하지만 본 P3 는 302 표준 유지.
  // 브라우저가 자동 리다이렉트하도록 redirect:"follow"(기본)로 다시 호출해도 되지만,
  // 그러면 R2 가 CORS 거부할 수 있어, 다운로드 시 a.href 를 직접 backend URL 로 두고
  // Authorization 헤더 없이 임시 토큰 쿼리 인증을 별도 도입하는 옵션을 후속에서 고려.
  // 본 P3 는 응답 헤더의 Location 을 우선 시도하고, 가려진 경우 fallback 으로 follow 모드 사용.
  const loc = res.headers.get("location");
  if (loc) return { url: loc };
  // fallback: follow 모드로 한번 더 호출(브라우저가 자동 리다이렉트, 최종 res.url 노출).
  const follow = await fetch(`${getApiBaseUrl()}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { url: follow.url };
};
