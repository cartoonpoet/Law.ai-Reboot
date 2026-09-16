// 문의·상담 API — AI 비서의 "문의" 탭. 관리자 답변은 알림(SSE)으로 바로 도착한다.
import type {
  ListMySupportThreadsResponse,
  SupportContext,
  SupportThreadDetail,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const listMySupportThreads = (): Promise<ListMySupportThreadsResponse> =>
  apiFetch<ListMySupportThreadsResponse>("/support");

export const getSupportThread = (id: string): Promise<SupportThreadDetail> =>
  apiFetch<SupportThreadDetail>(`/support/${id}`);

export const createSupportThread = (body: {
  subject: string;
  body: string;
  context?: SupportContext;
}): Promise<SupportThreadDetail> =>
  apiFetch<SupportThreadDetail>("/support", { method: "POST", body: JSON.stringify(body) });

export const addSupportMessage = (id: string, body: string): Promise<SupportThreadDetail> =>
  apiFetch<SupportThreadDetail>(`/support/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
