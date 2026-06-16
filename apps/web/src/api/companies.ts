import type { Company, CreateCompanyRequest } from "@lawai/contracts";
import { apiFetch } from "./client";

export function searchCompanies(q: string, limit = 10): Promise<Company[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<Company[]>(`/companies?${params.toString()}`);
}

export function createCompany(req: CreateCompanyRequest): Promise<Company> {
  return apiFetch<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
