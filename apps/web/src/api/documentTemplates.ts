import { apiFetch } from "./client";
import type {
  CreateTemplateRequest,
  CreateTemplateResponse,
  CreateTemplateVersionRequest,
  ListTemplatesResponse,
  ListTemplateVersionsResponse,
  TemplateCategoryTypes,
  TemplateDetailDto,
} from "@lawai/contracts";

export interface ListTemplatesQuery {
  categoryId?: TemplateCategoryTypes;
  q?: string;
}

const toQueryString = (query: ListTemplatesQuery): string => {
  const params = new URLSearchParams();
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const listTemplates = (query: ListTemplatesQuery = {}): Promise<ListTemplatesResponse> =>
  apiFetch<ListTemplatesResponse>(`/document-templates${toQueryString(query)}`);

export const getTemplate = (id: string): Promise<TemplateDetailDto> =>
  apiFetch<TemplateDetailDto>(`/document-templates/${id}`);

export type CreateTemplateInput = Pick<CreateTemplateRequest, "categoryId" | "name" | "content">;

export const createTemplate = (input: CreateTemplateInput): Promise<CreateTemplateResponse> =>
  apiFetch<CreateTemplateResponse>("/document-templates", { method: "POST", body: JSON.stringify(input) });

export type CreateTemplateVersionInput = Pick<CreateTemplateVersionRequest, "content" | "clauseCount">;

export const createTemplateVersion = (id: string, input: CreateTemplateVersionInput): Promise<TemplateDetailDto> =>
  apiFetch<TemplateDetailDto>(`/document-templates/${id}/versions`, { method: "POST", body: JSON.stringify(input) });

export const listTemplateVersions = (id: string): Promise<ListTemplateVersionsResponse> =>
  apiFetch<ListTemplateVersionsResponse>(`/document-templates/${id}/versions`);

export const revertTemplateVersion = (id: string, toVersionNo: number): Promise<TemplateDetailDto> =>
  apiFetch<TemplateDetailDto>(`/document-templates/${id}/revert`, {
    method: "POST",
    body: JSON.stringify({ toVersionNo }),
  });
