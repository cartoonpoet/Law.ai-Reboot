import type { FileAttachmentDto, FileRole } from "@lawai/contracts";
import { confirmFile, presignFile } from "../../../api/files";

// 클라이언트 SHA-256 hex — presign 요청에 동봉.
const sha256Hex = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * presign → R2 PUT → confirm 한 사이클을 함수 한 개로.
 * FileUploadField 의 인라인 업로드와 useContractSubmit (create 모드 사후 업로드) 가
 * 같은 로직을 공유하도록 단일 출처로 추출.
 */
export const uploadContractFile = async (
  contractId: string,
  role: FileRole,
  file: File,
): Promise<FileAttachmentDto> => {
  const sha256 = await sha256Hex(file);
  const presign = await presignFile({
    contractId,
    role,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
    sha256,
  });
  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`업로드 실패 (${putRes.status})`);
  }
  const etag = putRes.headers.get("etag")?.replace(/^"|"$/g, "") || sha256;
  return confirmFile({ uploadToken: presign.uploadToken, etag });
};
