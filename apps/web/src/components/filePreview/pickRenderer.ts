// 단일 출처 — 파일 MIME (없으면 확장자 fallback) → 렌더러 키. FilePreviewModal 이 분기에 사용.

export type RendererKey = "pdf" | "image" | "docx" | "unsupported";

const PDF_MIMES = new Set(["application/pdf"]);
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const PDF_EXT = /\.pdf$/i;
const IMAGE_EXT = /\.(png|jpe?g)$/i;
const DOCX_EXT = /\.docx?$/i;

/**
 * mimeType 우선, 비어 있으면 파일명 확장자로 폴백.
 * 매핑이 한 곳에 모여 있어야 DOCX/HWP 신규 추가 시 한 군데만 고치면 된다.
 */
export const pickRenderer = (
  mimeType: string | null | undefined,
  fileName: string,
): RendererKey => {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt && PDF_MIMES.has(mt)) return "pdf";
  if (mt && IMAGE_MIMES.has(mt)) return "image";
  if (mt && DOCX_MIMES.has(mt)) return "docx";
  if (PDF_EXT.test(fileName)) return "pdf";
  if (IMAGE_EXT.test(fileName)) return "image";
  if (DOCX_EXT.test(fileName)) return "docx";
  return "unsupported";
};
