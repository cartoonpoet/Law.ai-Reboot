import { apiFetch } from "./client";
import type {
  AiDraftResponse,
  AiReviewResponse,
  AiRewriteResponse,
  ExportDocumentResponse,
  ImportDocumentResponse,
} from "@lawai/contracts";

export const exportDocument = (content: Record<string, unknown>, fileName: string): Promise<ExportDocumentResponse> =>
  apiFetch<ExportDocumentResponse>("/documents/export", { method: "POST", body: JSON.stringify({ content, fileName }) });

export const importDocument = (base64: string, fileName: string): Promise<ImportDocumentResponse> =>
  apiFetch<ImportDocumentResponse>("/documents/import", { method: "POST", body: JSON.stringify({ base64, fileName }) });

export const requestAiDraft = (request: string): Promise<AiDraftResponse> =>
  apiFetch<AiDraftResponse>("/documents/ai-draft", { method: "POST", body: JSON.stringify({ request }) });

export const requestAiRewrite = (selectedText: string, instruction: string): Promise<AiRewriteResponse> =>
  apiFetch<AiRewriteResponse>("/documents/ai-rewrite", { method: "POST", body: JSON.stringify({ selectedText, instruction }) });

export const requestAiReview = (html: string): Promise<AiReviewResponse> =>
  apiFetch<AiReviewResponse>("/documents/ai-review", { method: "POST", body: JSON.stringify({ html }) });

/** 브라우저 File → base64(데이터 URL 접두사 없이 순수 바이트 부분만). */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** docx export 응답(base64) → 업로드/폼에 바로 쓸 수 있는 File 객체. */
export const base64ToDocxFile = (res: ExportDocumentResponse): File => {
  const binary = atob(res.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], res.fileName, { type: res.mimeType });
};
