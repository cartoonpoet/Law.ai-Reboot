import type {
  ContractResponse,
  ContractStatus,
  CreateContractRequest,
  ListContractsResponse,
  StatusCloseReason,
  TerminationReason,
  UpdateContractRequest,
} from "@lawai/contracts";
import { apiFetch, apiFetchVoid } from "./client";

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
  // closed 로 바꿀 때 종료 사유(없으면 서버 기본 completed). 만료 관리의 "만료로 종료"는 expired.
  closedReason?: StatusCloseReason,
): Promise<ContractResponse> {
  return apiFetch<ContractResponse>(`/contracts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(closedReason ? { closedReason } : {}),
    }),
  });
}

// 만료 관리 "AI로 읽기" — 자동갱신·해지 통지 조항 추출을 시작한다(결과는 getAiAnalysis kind=renewalTerms).
export const analyzeRenewalTerms = (id: string): Promise<void> =>
  apiFetchVoid(`/contracts/${id}/ai/renewal-terms`, { method: "POST" });

export interface ListContractsParams {
  q?: string;
  status?: ContractStatus;
  statuses?: string;
  expiry?: "d7" | "d30" | "d90" | "d180" | "expired";
  // periodEnd = 만료가 가까운 순(만료 관리). 없으면 최근 수정 순.
  sort?: "periodEnd";
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
  if (params.sort) search.set("sort", params.sort);
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

// 서명본 교체 — 체결된 계약에서 법무팀만. fileId 는 새로 첨부(attach)한 파일, reason 은 감사 로그에 남는다.
// 기존 서명본은 서버가 첨부로 내려 이력으로 보존한다.
// 중도 해지 — 해지일·사유·메모와 이 계약에 새로 첨부한 해지 합의서(통지서) 파일로 계약을 종료한다.
export const terminateContract = (
  id: string,
  body: { terminatedOn: string; reason: TerminationReason; note?: string; fileId: string },
): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/terminate`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const replaceSignedFile = (
  id: string,
  body: { fileId: string; reason: string },
): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/signed-file/replace`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// 계약 삭제(소프트 삭제) — 담당자 배정 전 생성자 본인 또는 시스템 관리자. 체결 결재 중에는 서버가 거부한다.
export const deleteContract = (id: string): Promise<{ ok: true }> =>
  apiFetch<{ ok: true }>(`/contracts/${id}`, { method: "DELETE" });
