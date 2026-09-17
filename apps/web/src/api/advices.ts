// 법률자문 API — 요청 · 조회 · 담당 배정 · 질의/회신 · 종결.
import type {
  AdviceMessageKindTypes,
  AdviceResponse,
  CreateAdviceRequest,
  ListAdvicesResponse,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export type CreateAdviceBody = Omit<CreateAdviceRequest, "viewerId" | "tenantContext">;

export interface ListAdvicesParams {
  statuses?: string;
  q?: string;
  category?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export const listAdvices = (params: ListAdvicesParams = {}): Promise<ListAdvicesResponse> => {
  const search = new URLSearchParams();
  if (params.statuses) search.set("statuses", params.statuses);
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.mine) search.set("mine", "true");
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const query = search.toString();
  return apiFetch<ListAdvicesResponse>(query ? `/advices?${query}` : "/advices");
};

export const getAdvice = (id: string): Promise<AdviceResponse> => apiFetch<AdviceResponse>(`/advices/${id}`);

export const createAdvice = (body: CreateAdviceBody): Promise<AdviceResponse> =>
  apiFetch<AdviceResponse>("/advices", { method: "POST", body: JSON.stringify(body) });

export const assignAdvice = (id: string, ownerId: string): Promise<AdviceResponse> =>
  apiFetch<AdviceResponse>(`/advices/${id}/assign`, { method: "POST", body: JSON.stringify({ ownerId }) });

export const addAdviceMessage = (id: string, kind: AdviceMessageKindTypes, body: string): Promise<AdviceResponse> =>
  apiFetch<AdviceResponse>(`/advices/${id}/messages`, { method: "POST", body: JSON.stringify({ kind, body }) });

export const closeAdvice = (id: string): Promise<AdviceResponse> =>
  apiFetch<AdviceResponse>(`/advices/${id}/close`, { method: "POST" });
