import type { ContractResponse, CreateContractRequest } from "@lawai/contracts";
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
