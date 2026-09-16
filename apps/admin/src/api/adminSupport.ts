import type {
  AdminSupportListResponse,
  AdminSupportThreadDetail,
  SupportStatusTypes,
} from "@lawai/contracts";
import { apiFetch } from "./client";

// 문의함 목록 — 상태로 거르고 offset 으로 페이지를 넘긴다.
export const listAdminSupportThreads = (params: {
  status?: SupportStatusTypes | "";
  limit?: number;
  offset?: number;
}): Promise<AdminSupportListResponse> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const queryString = query.toString();
  return apiFetch<AdminSupportListResponse>(`/admin/support${queryString ? `?${queryString}` : ""}`);
};

export const getAdminSupportThread = (id: string): Promise<AdminSupportThreadDetail> =>
  apiFetch<AdminSupportThreadDetail>(`/admin/support/${id}`);

export const replyAdminSupportThread = (
  id: string,
  body: { body: string; close?: boolean },
): Promise<AdminSupportThreadDetail> =>
  apiFetch<AdminSupportThreadDetail>(`/admin/support/${id}/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
