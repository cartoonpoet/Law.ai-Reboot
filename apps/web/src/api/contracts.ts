import type {
  ContractResponse,
  ContractStatus,
  CreateContractRequest,
  ListContractsResponse,
  UpdateContractRequest,
} from "@lawai/contracts";
import { apiFetch } from "./client";

// createdById 는 gateway 가 JWT 에서 주입하므로 클라이언트는 보내지 않는다.
export type CreateContractInput = Omit<CreateContractRequest, "createdById">;

export function createContract(
  req: CreateContractInput,
): Promise<ContractResponse> {
  return apiFetch<ContractResponse>("/contracts", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getContract(id: string): Promise<ContractResponse> {
  return apiFetch<ContractResponse>(`/contracts/${id}`);
}

export type UpdateContractInput = Omit<UpdateContractRequest, "id">;

export function updateContract(
  id: string,
  req: UpdateContractInput,
): Promise<ContractResponse> {
  return apiFetch<ContractResponse>(`/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function updateContractStatus(
  id: string,
  status: ContractStatus,
  ownerId?: string | null,
): Promise<ContractResponse> {
  return apiFetch<ContractResponse>(`/contracts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(ownerId !== undefined ? { ownerId } : {}) }),
  });
}

export interface ListContractsParams {
  q?: string;
  status?: ContractStatus;
  statuses?: string;
  expiry?: "d90" | "d180" | "expired";
  party?: string;
  categoryId?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export function listContracts(
  params: ListContractsParams = {},
): Promise<ListContractsResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.statuses) search.set("statuses", params.statuses);
  if (params.expiry) search.set("expiry", params.expiry);
  if (params.party) search.set("party", params.party);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.mine) search.set("mine", "true");
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return apiFetch<ListContractsResponse>(`/contracts${qs ? `?${qs}` : ""}`);
}

// 체결 품의 상신 — 요청자 본인 + 검토 완료(reviewDone) 상태에서만.
export const submitContractApproval = (id: string): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/approval/submit`, {
    method: "POST",
  });

// 체결 처리 — 인감 담당 + 결재 전원 승인 상태에서만. fileId 는 필수(서버가 실제 바이트가 있는
// 서명본을 요구한다 — client/server 비대칭 방지를 위해 이 계층부터 required 로 맞춘다).
export const completeSigning = (
  id: string,
  body: { signedAt: string; fileId: string; note?: string | null },
): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/complete-signing`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// 체결 완료 등록 확정 — 미배정 상태의 생성자 본인만, 실제 업로드된(storageKey 있는)
// role=signed 파일이 있어야 통과. completeSigning 과 별개(결재선 없음).
export const finalizeRegistration = (
  id: string,
  body: { signedAt: string },
): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/finalize`, {
    method: "POST",
    body: JSON.stringify(body),
  });
