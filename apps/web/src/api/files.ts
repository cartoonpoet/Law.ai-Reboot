import type {
  ConfirmUploadRequest,
  FileAttachmentDto,
  GetDownloadUrlResponse,
  PresignUploadRequest,
  PresignUploadResponse,
} from "@lawai/contracts";
import { apiFetch } from "./client";

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

// 다운로드 — gateway 가 단기 presigned R2 URL 을 JSON 으로 반환한다(302 리다이렉트 X).
// 단일 호출. 받은 url 을 window.open 으로 새 탭에서 연다.
export const getDownloadUrl = (
  fileId: string,
): Promise<GetDownloadUrlResponse> =>
  apiFetch<GetDownloadUrlResponse>(`/files/${fileId}/download`);
