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

// 감사 로그 액션 종류(서비스/프론트 공유). AuditLog.action 과 일치.
export type AuditAction = "create" | "update" | "delete" | "transition" | "view";

// 조회자(viewer)가 해당 계약에 대해 수행 가능한 액션. authz evaluate 결과에서 산출.
export interface ContractCan {
  edit: boolean;
  assign: boolean;
  transition: boolean;
  delete: boolean;
}

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

// 첨부 파일 입력.
// - id 가 있으면 이미 presign/confirm 으로 R2 업로드된 File row → 서버는 role/sortOrder 만 갱신, R2 객체 보존.
// - id 가 없으면 메타데이터-only(레거시 흐름) → 서버가 새 File row 생성.
export interface FileInput {
  id?: string;
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

/** 계약검토 요청 생성 — createdById 는 gateway 가 JWT 에서 주입한다.
 * id 가 제공되면 그 값으로 contract.id 를 강제(없으면 서버에서 uuid 생성).
 * 클라이언트 사전 생성 흐름: 신규 작성 페이지에서 첨부 파일을 즉시 R2 업로드하려면
 * presign(contractId) 가 미리 같은 id 를 알아야 하므로 client UUID + 동일 id 로 create. */
export interface CreateContractRequest {
  id?: string;
  title: string;
  securityLevel: SecurityLevel;
  reviewType: ReviewType;
  party?: string | null;
  categoryId?: string | null;
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
  // 조회자 id(gateway가 JWT sub 주입). 권한 없으면 비밀 참조자 숨김 + 상대회사 PII 마스킹.
  viewerId?: string;
}

// 계약 필드 수정(부분). 관계(상대계약자/결재선/파일/참조)는 변경하지 않는다.
export interface UpdateContractRequest {
  id: string;
  title?: string;
  securityLevel?: SecurityLevel;
  reviewType?: ReviewType;
  party?: string | null;
  categoryId?: string | null;
  requesterId?: string | null;
  ownerId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueDate?: string | null;
  schemaVersion?: number;
  details?: ContractDetailsV1;
  // 관계: 제공 시 해당 관계 전체 교체(미제공이면 유지).
  counterparties?: CounterpartyInput[];
  approvers?: ApproverSnapshot[];
  files?: FileInput[];
  references?: CcRecipientInput[];
  // 조회자 id(gateway가 JWT sub 주입). user-service에서 수정 권한(canEdit) 평가에 사용.
  viewerId?: string;
}

// 상태 전이. ownerId 지정 시 함께 배정.
export interface UpdateContractStatusRequest {
  id: string;
  status: ContractStatus;
  ownerId?: string | null;
  // 조회자 id(gateway가 JWT sub 주입). user-service에서 전이/배정 권한 평가에 사용.
  viewerId?: string;
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
  categoryId: string | null;
  categoryLabel: string | null;
  requesterId: string | null;
  requesterName: string | null;
  ownerId: string | null;
  ownerName: string | null;
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
  // 조회자(viewer)별 수행 가능 액션. get 경로에서만 산출(list 등은 미산출).
  can?: ContractCan;
}

// 목록 행(요약). 상세(details/관계 전체)는 제외하고 목록 표시에 필요한 필드만.
export interface ContractSummary {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  securityLevel: SecurityLevel;
  party: string | null;
  categoryLabel: string | null;
  counterpartyName: string | null; // 첫 상대계약자 스냅샷 이름
  requesterId: string | null;
  requesterName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  createdById: string;
  updatedAt: string;
}

export interface ListContractsRequest {
  q?: string;
  status?: ContractStatus;
  party?: string;
  categoryId?: string;
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
