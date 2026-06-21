import type { Company } from "./company.dto";

export type SecurityLevel = "top" | "secure" | "normal";
export type ReviewType = "normal" | "std";
export type ApproverType = "draft" | "approve" | "agree" | "refer";

export interface EntityRef {
  id: string;
  name: string;
}

export interface RelatedDocRef {
  id: string;
  name: string;
  category: "contract" | "advice" | "litigation" | "legalProject";
  sub: string;
  date: string;
}

export interface ApproverSnapshot {
  name: string;
  dept: string;
  type: ApproverType;
}

export interface MoneyRow {
  vat: "excluded" | "included" | "none";
  amount: number | null;
  currency: string;
}

export interface UploadedFileMeta {
  name: string;
  meta: string;
}

/**
 * schemaVersion = 1 의 details(JSONB) 모양.
 * 코어 컬럼(목록/필터/정렬/워크플로/보안)에 들어가지 않는 폼 필드 전부를 보관한다.
 * 폼이 바뀌면 이 인터페이스를 새 버전으로 추가하고 schemaVersion 을 올린다.
 */
export interface ContractDetailsV1 {
  stage: "new" | "change";
  periodText: string;
  periodManual: boolean;
  noEndDate: boolean;
  lang: "ko" | "en" | "koen" | "etc";
  legal: "dom" | "intl" | "";
  negotiation: number;
  money: MoneyRow[];
  moneyNote: string;
  payTerms: string;
  purpose: string;
  keyPoints: string;
  concerns: string;
  urls: string[];
  ccUsers: EntityRef[];
  ccDepts: EntityRef[];
  ccSecret: EntityRef[];
  owner: EntityRef | null;
  project: EntityRef | null;
  relatedDocs: RelatedDocRef[];
  approvers: ApproverSnapshot[];
  contractFiles: UploadedFileMeta[];
  attachFiles: UploadedFileMeta[];
  refFiles: UploadedFileMeta[];
}

export interface CounterpartyInput {
  companyId: string;
  partyType?: string | null;
  snapshot: Company; // 체결 시점 회사 정보 동결
}

/** 계약검토 요청 생성 — createdById 는 gateway 가 JWT 에서 주입한다. */
export interface CreateContractRequest {
  title: string;
  securityLevel: SecurityLevel;
  reviewType: ReviewType;
  party?: string | null;
  catMajor?: string | null;
  catMinor?: string | null;
  catSub?: string | null;
  requesterId?: string | null;
  ownerId?: string | null;
  createdById: string;
  periodStart?: string | null; // ISO 8601 또는 ""
  periodEnd?: string | null;
  dueDate?: string | null;
  schemaVersion: number;
  details: ContractDetailsV1;
  counterparties: CounterpartyInput[];
}

export interface GetContractRequest {
  id: string;
}

export interface CounterpartyResponse {
  id: string;
  companyId: string;
  partyType: string | null;
  snapshot: Company;
}

export interface ContractResponse {
  id: string;
  title: string;
  securityLevel: SecurityLevel;
  reviewType: ReviewType;
  party: string | null;
  catMajor: string | null;
  catMinor: string | null;
  catSub: string | null;
  requesterId: string | null;
  ownerId: string | null;
  createdById: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  schemaVersion: number;
  details: ContractDetailsV1;
  counterparties: CounterpartyResponse[];
  createdAt: string;
  updatedAt: string;
}
