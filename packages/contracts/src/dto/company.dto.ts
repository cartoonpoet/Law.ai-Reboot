export type CompanyType = "company" | "individual";

export interface SearchCompaniesRequest {
  q: string;
  limit?: number;
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
