import type { TenantContext } from "./tenant.dto";

export type CompanyType = "company" | "individual";

export interface SearchCompaniesRequest {
  q: string;
  limit?: number;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

export interface CreateCompanyRequest {
  type: CompanyType;
  name: string;
  bizNo?: string;
  ceo?: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

export interface Company {
  id: string;
  type: CompanyType;
  name: string;
  bizNo: string;
  ceo: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerEmail: string | null;
  createdAt: string;
}
