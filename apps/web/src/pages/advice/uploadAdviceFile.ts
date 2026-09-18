import type { FileAttachmentDto } from "@lawai/contracts";
import { confirmFile, presignFile } from "../../api/files";

// 클라이언트 SHA-256 hex — presign 요청에 동봉(계약 첨부와 같은 방식).
const sha256Hex = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/** 자문 첨부 한 개 올리기 — presign → 업로드(우리 서버 경유) → confirm. */
export const uploadAdviceFile = async (adviceId: string, file: File): Promise<FileAttachmentDto> => {
  const sha256 = await sha256Hex(file);
  const presign = await presignFile({
    adviceId,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
    sha256,
  });
  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putResponse.ok) throw new Error(`업로드 실패 (${putResponse.status})`);
  const etag = putResponse.headers.get("etag")?.replace(/^"|"$/g, "") || sha256;
  return confirmFile({ uploadToken: presign.uploadToken, etag });
};
