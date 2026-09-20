// 표준양식(템플릿) — 회사(테넌트)별 계약서 양식. 버전은 불변(저장마다 새 버전), 되돌리기도 새 버전 저장.
import type { TenantContext } from "./tenant.dto";

export type TemplateCategoryTypes = "nda" | "service" | "supply" | "entrust" | "license" | "etc";

export interface TemplateVersionDto {
  versionNo: number;
  content: Record<string, unknown>; // Tiptap JSON
  clauseCount: number | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string; // ISO
}

export interface TemplateSummaryDto {
  id: string;
  categoryId: TemplateCategoryTypes;
  name: string;
  currentVersionNo: number;
  createdById: string;
  createdByName: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// 상세 = 목록 정보 + 현재 버전 내용(가장 최근 버전 하나).
export interface TemplateDetailDto extends TemplateSummaryDto {
  currentVersion: TemplateVersionDto;
}

interface TemplateViewerRequest {
  viewerId: string;
  tenantContext: TenantContext;
}

export interface CreateTemplateRequest extends TemplateViewerRequest {
  categoryId: TemplateCategoryTypes;
  name: string;
  // 빈 문서로 시작하면 빈 Tiptap doc, DOCX 업로드로 시작하면 documents.import 결과 HTML을 클라이언트가
  // Tiptap JSON으로 변환해 여기 담아 보낸다.
  content: Record<string, unknown>;
}

export interface CreateTemplateResponse {
  template: TemplateDetailDto;
}

export interface ListTemplatesRequest extends TemplateViewerRequest {
  categoryId?: TemplateCategoryTypes;
  q?: string;
}

export interface ListTemplatesResponse {
  items: TemplateSummaryDto[];
  // 분류별 건수(필터 탭 숫자) — q는 반영하지 않은 전체 건수.
  counts: Record<TemplateCategoryTypes, number>;
}

export interface GetTemplateRequest extends TemplateViewerRequest {
  id: string;
}

export interface CreateTemplateVersionRequest extends TemplateViewerRequest {
  id: string;
  content: Record<string, unknown>;
  clauseCount: number | null;
}

export interface ListTemplateVersionsRequest extends TemplateViewerRequest {
  id: string;
}

export interface ListTemplateVersionsResponse {
  versions: TemplateVersionDto[]; // 최신이 먼저
}

// 되돌리기 = 옛 버전 content 를 그대로 새 버전으로 저장(특수 케이스 아님).
export interface RevertTemplateVersionRequest extends TemplateViewerRequest {
  id: string;
  toVersionNo: number;
}
