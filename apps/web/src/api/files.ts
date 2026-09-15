import type {
  AuditCompareReportRequest,
  ConfirmUploadRequest,
  FileAttachmentDto,
  GetDownloadUrlResponse,
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

// 서버는 API 기준 경로(/files/:id/content?token=)를 주므로 API 주소를 앞에 붙인다.
const toApiUrl = (url: string) =>
  url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url;

// 다운로드 — 권한 확인 후 우리 서버를 거쳐 파일을 받는 단기 주소를 JSON 으로 받는다(302 리다이렉트 X).
// 회사망 등에서 브라우저가 파일 저장소(R2)에 직접 닿지 못해도 열리도록 서버가 중계한다.
// 받은 url 은 로그인 헤더 없이 <img>·PDF 뷰어·새 탭에서 바로 쓸 수 있다.
export const getDownloadUrl = async (
  fileId: string,
): Promise<GetDownloadUrlResponse> => {
  const res = await apiFetch<GetDownloadUrlResponse>(`/files/${fileId}/download`);
  return { ...res, url: toApiUrl(res.url) };
};

// 비교 보고서 PDF 다운로드 감사. PDF blob 생성/다운로드 직후 best-effort 호출.
// 서버가 두 fileId 가 같은 contract 인지 + viewer canView 인지 재검증 후 AuditLog 1행 작성.
export const logCompareReportDownload = (
  req: Omit<AuditCompareReportRequest, "viewerId">,
): Promise<{ ok: true }> =>
  apiFetch<{ ok: true }>("/files/audit/compare-report", {
    method: "POST",
    body: JSON.stringify(req),
  });
