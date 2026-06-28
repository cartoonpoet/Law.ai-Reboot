import { pickRenderer, type RendererKey } from "../pickRenderer";

// 추출 가능한 포맷 — diff 모드 활성 여부 판정에 사용.
const TEXT_EXTRACTABLE: ReadonlySet<RendererKey> = new Set(["pdf", "docx"]);

export const isTextExtractable = (
  mimeType: string | null | undefined,
  fileName: string,
): boolean => TEXT_EXTRACTABLE.has(pickRenderer(mimeType, fileName));

/**
 * presigned URL + (mimeType, fileName) 로 평문을 뽑는다.
 *
 * - PDF/DOCX 외엔 throw — 호출 전에 isTextExtractable 로 가드.
 * - 추출 코드는 동적 import (PdfRenderer/DocxRenderer 와 청크 공유 가능).
 */
export const extractText = async (
  url: string,
  mimeType: string | null | undefined,
  fileName: string,
): Promise<string> => {
  const kind = pickRenderer(mimeType, fileName);
  if (kind === "pdf") {
    const { extractPdf } = await import("./extractPdf");
    return extractPdf(url);
  }
  if (kind === "docx") {
    const { extractDocx } = await import("./extractDocx");
    return extractDocx(url);
  }
  throw new Error(`텍스트 추출 미지원 포맷: ${kind}`);
};
