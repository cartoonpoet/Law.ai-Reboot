import type { Company } from "./company.dto";

export type SecurityLevel = "top" | "secure" | "normal";
export type ReviewType = "normal" | "std";
export type ContractStatus =
  | "draft"
  | "unassigned"
  | "assigning"
  | "legalReview"
  | "requesterReview"
  | "reviewDone"
  | "signing"
  | "signed"
  | "fulfilling"
  | "closed";
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

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type StepStatus = "pending" | "approved" | "rejected";

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

export type FileRole = "contract" | "attach" | "ref";

// 첨부 파일 입력(메타데이터 행). 실제 업로드 전까지 size/mimeType/storageKey 는 미전송.
export interface FileInput {
  role: FileRole;
  name: string;
  meta: string;
  sortOrder: number;
}

export type CcType = "user" | "dept";

// 참조수신자(cc) 입력. ccType(user/dept) + isSecret 두 축. refId 는 디렉토리 id, name 은 표시 스냅샷.
export interface CcRecipientInput {
  ccType: CcType;
  isSecret: boolean;
  refId: string;
  name: string;
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
  owner: EntityRef | null;
  project: EntityRef | null;
  relatedDocs: RelatedDocRef[];
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
  // 결재선: 폼 approvers 스냅샷을 배열 순서대로 단계로 정규화한다(빈 배열이면 결재선 미생성).
  approvers: ApproverSnapshot[];
  // 첨부 파일 메타데이터(계약서/첨부/참고). role+sortOrder 로 정규화.
  files: FileInput[];
  // 참조수신자(cc). 폼 ccUsers/ccDepts/ccSecret 을 ccType+isSecret 으로 통합.
  references: CcRecipientInput[];
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

export interface ApprovalStepResponse {
  id: string;
  stepOrder: number;
  name: string;
  dept: string;
  type: ApproverType;
  status: StepStatus;
}

export interface ApprovalLineResponse {
  id: string;
  status: ApprovalStatus;
  steps: ApprovalStepResponse[];
}

export interface FileResponse {
  id: string;
  role: FileRole;
  name: string;
  meta: string | null;
  size: number | null;
  mimeType: string | null;
  storageKey: string | null;
  sortOrder: number;
}

export interface CcRecipientResponse {
  id: string;
  ccType: CcType;
  isSecret: boolean;
  refId: string;
  name: string;
}

export interface ContractResponse {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
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
  approvalLine: ApprovalLineResponse | null;
  files: FileResponse[];
  references: CcRecipientResponse[];
  createdAt: string;
  updatedAt: string;
}

// 목록 행(요약). 상세(details/관계 전체)는 제외하고 목록 표시에 필요한 필드만.
export interface ContractSummary {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  securityLevel: SecurityLevel;
  party: string | null;
  catSub: string | null;
  counterpartyName: string | null; // 첫 상대계약자 스냅샷 이름
  requesterId: string | null;
  ownerId: string | null;
  dueDate: string | null;
  createdById: string;
  updatedAt: string;
}

export interface ListContractsRequest {
  q?: string;
  status?: ContractStatus;
  party?: string;
  // createdById 지정 시 "내 업무만"(gateway 가 JWT sub 주입).
  mineOf?: string;
  page?: number;
  pageSize?: number;
}

export interface ListContractsResponse {
  items: ContractSummary[];
  total: number;
  page: number;
  pageSize: number;
}
