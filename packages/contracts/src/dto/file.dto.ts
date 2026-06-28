// 첨부 파일(R2 업로드 + 코멘트 첨부) DTO 및 화이트리스트 상수.
// 클라이언트(즉시 거절)·gateway(class-validator)·user-service(서버 가드) 모두 단일 출처로 import.

// 허용 MIME 타입(법무팀 워크플로 — Office/HWP/PDF/PNG/JPG).
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-hwp",
  "application/haansofthwp",
  "application/vnd.hancom.hwpx",
  "application/x-hwpx",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 허용 확장자(클라이언트 input accept + 서버 fileName 검사).
export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".hwp",
  ".hwpx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

// 단일 파일 최대 크기(50MB).
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// 코멘트 1개당 첨부 최대 개수.
export const MAX_FILES_PER_COMMENT = 5;

// presign 요청 — 클라이언트가 SubtleCrypto sha256 hex 계산 후 호출.
export interface PresignUploadRequest {
  contractId: string;
  // 코멘트 생성 전 첨부는 null. presign 단계에서 commentId 지정도 허용(미래).
  commentId?: string | null;
  // 어떤 슬롯의 파일인지 — 계약 본 파일은 contract/attach/ref, 코멘트 첨부는 (생략 시) attach.
  // 토큰에 인코딩돼 confirm 시 File.role 로 그대로 저장된다.
  role?: "contract" | "attach" | "ref" | "etc";
  fileName: string;
  size: number;
  mimeType: string;
  sha256: string; // 64자 hex
  // gateway 가 JWT sub 주입.
  viewerId?: string;
}

// presign 응답 — uploadToken 으로 confirm 단계 위변조 방지.
export interface PresignUploadResponse {
  uploadUrl: string;
  uploadToken: string;
  storageKey: string;
  // 초 단위 TTL(클라 표시용). PUT 만료 시 재요청.
  expiresIn: number;
}

// confirm 요청 — uploadToken verify 후 HeadObject 검증 + File row 생성.
export interface ConfirmUploadRequest {
  uploadToken: string;
  // R2 PUT 응답의 ETag(checksum 컬럼에 보관 — 단일 PUT 시 sha256 hex 동치).
  etag: string;
  viewerId?: string;
}

// 코멘트 첨부 표시용(목록/상세 응답에 포함). 다운로드는 /files/:id/download 로.
export interface FileAttachmentDto {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  sha256: string | null;
  createdAt: string;
}

// 단기 presigned GET URL 발급 요청. fileId 1건 → 권한 검증 후 URL 반환.
export interface GetDownloadUrlRequest {
  fileId: string;
  viewerId?: string;
}

export interface GetDownloadUrlResponse {
  url: string;
  expiresIn: number;
}

// 비교 보고서 PDF 다운로드 감사 기록. 클라이언트가 PDF 생성 직후 best-effort 로 호출.
// fileAId/fileBId 가 같은 contractId 의 파일인지 + viewer 가 canView 인지 서버가 검증.
export interface AuditCompareReportRequest {
  contractId: string;
  fileAId: string;
  fileAName: string;
  fileBId: string;
  fileBName: string;
  addedLines: number;
  removedLines: number;
  viewerId?: string;
}
