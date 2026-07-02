import type { ContractCategoryDto } from "@lawai/contracts";
import { apiFetch } from "./client";

// 계약 분류 트리(flat, parentId 포함) — cascade/역산은 프론트에서 파생.
export const getContractCategories = (): Promise<ContractCategoryDto[]> =>
  apiFetch<ContractCategoryDto[]>("/contract-categories");
