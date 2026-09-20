// 문서 편집기 — Tiptap JSON ↔ 진짜 .docx 변환(무상태), DOCX 업로드 들여오기, 로아이 AI 3종.
import type { TenantContext } from "./tenant.dto";

interface DocumentViewerRequest {
  viewerId: string;
  tenantContext: TenantContext;
}

// Tiptap JSON → .docx 바이트(base64). 파일 자체를 저장하지 않는 stateless 변환.
export interface ExportDocumentRequest extends DocumentViewerRequest {
  content: Record<string, unknown>;
  // 파일명(확장자 없이) — 응답 파일명에 그대로 쓰인다.
  fileName: string;
}

export interface ExportDocumentResponse {
  // .docx 바이트를 base64로 인코딩 — RPC(JSON) 경계를 그대로 통과시키기 위함.
  base64: string;
  fileName: string; // "<fileName>.docx"
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

// .docx 업로드 → mammoth.convertToHtml() → 에디터에 채울 HTML. 원본 파일은 저장하지 않는다.
export interface ImportDocumentRequest extends DocumentViewerRequest {
  base64: string; // 업로드된 .docx 바이트
  fileName: string;
}

export interface ImportDocumentResponse {
  html: string;
  // mammoth 가 변환 중 건너뛴 서식이 있으면 경고 메시지(없으면 빈 배열).
  warnings: string[];
}

// AI 3종 공통 — 로아이(assistant.chat)와 같은 방식: 본인 AI 키로만 동작, 없으면 needsSetup.
export interface AiDraftRequest extends DocumentViewerRequest {
  // 사용자 요청 한 줄(예: "비밀유지계약서 초안을 만들어 줘").
  request: string;
}

export interface AiDraftResponse {
  html: string;
  needsSetup: boolean;
}

export interface AiRewriteRequest extends DocumentViewerRequest {
  // 편집기에서 고른 문장/구간의 텍스트.
  selectedText: string;
  // 지시문(예: "다듬어줘", "조항으로 써줘").
  instruction: string;
}

export interface AiRewriteResponse {
  rewrittenText: string;
  needsSetup: boolean;
}

export type AiReviewSeverityTypes = "danger" | "warning" | "info";

export interface AiReviewFinding {
  severity: AiReviewSeverityTypes;
  kind: "위험 조항" | "빈칸" | "누락 조항";
  title: string;
  where: string; // 어느 조항/구간인지
  note: string;
}

export interface AiReviewRequest extends DocumentViewerRequest {
  // 지금 편집기 전체 내용(HTML로 변환해 보낸다 — 프롬프트가 이해하기 쉬운 형태).
  html: string;
}

export interface AiReviewResponse {
  findings: AiReviewFinding[];
  needsSetup: boolean;
}
