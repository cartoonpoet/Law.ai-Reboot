import type { AdminDeletedContractListResponse, AdminRestoreContractResult } from "@lawai/contracts";
import { apiFetch } from "./client";

export const listDeletedContracts = (): Promise<AdminDeletedContractListResponse> =>
  apiFetch<AdminDeletedContractListResponse>("/admin/contracts/deleted");

export const restoreContract = (id: string): Promise<AdminRestoreContractResult> =>
  apiFetch<AdminRestoreContractResult>(`/admin/contracts/${id}/restore`, { method: "POST" });
