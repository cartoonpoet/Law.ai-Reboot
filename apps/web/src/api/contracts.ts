import type {
  ContractResponse,
  ContractStatus,
  CreateContractRequest,
  ListContractsResponse,
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

export interface ListContractsParams {
  q?: string;
  status?: ContractStatus;
  party?: string;
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
  if (params.party) search.set("party", params.party);
  if (params.mine) search.set("mine", "true");
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return apiFetch<ListContractsResponse>(`/contracts${qs ? `?${qs}` : ""}`);
}
