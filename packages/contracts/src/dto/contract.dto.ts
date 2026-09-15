import type { TenantContext } from "./tenant.dto";
import type { Company } from "./company.dto";
import type { PushNotification } from "./comment.dto";

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
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "transition"
  | "view"
  // 삭제된 계약 복구(시스템 관리자).
  | "restore"
  // 두 파일 비교 결과 PDF 다운로드 — 결재 첨부·감사 보관용. detail 에 두 파일 메타와 변경 요약.
  | "compare_report_download";

// 조회자(viewer)가 해당 계약에 대해 수행 가능한 액션. authz evaluate 결과에서 산출.
export interface ContractCan {
  edit: boolean;
  assign: boolean;
  transition: boolean;
  delete: boolean;
  // 체결된 계약의 서명본 교체(법무팀 전용).
  replaceSignedFile: boolean;
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
  // 실제 결재자 userId. 과거 저장분 호환을 위해 optional/null 허용.
  userId?: string | null;
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

export type FileRole = "contract" | "attach" | "ref" | "signed";

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
  // 계약 단계 — 신규 / 갱신 / 변경 / 해지. 갱신·변경·해지는 originContractId 로 원 계약을 가리킨다.
  // (예전 "change" 는 "변경·해지"였고, 지금은 "변경"으로 읽는다.)
  stage: ContractStage;
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
  /** 등록 유형. "signed" 면 검토·결재를 건너뛰고 곧바로 체결 완료(signed)로 생성한다.
   *  미지정/"review" 는 기존 동작과 완전히 동일. */
  registerAs?: "review" | "signed";
  /** 실제 서명 완료일(ISO 8601). registerAs="signed" 일 때 필수. */
  signedAt?: string | null;
  /** 갱신·변경·해지 요청의 원 계약 id. 갱신·해지는 필수, 신규는 무시된다. */
  originContractId?: string | null;
  details: ContractDetailsV1;
  counterparties: CounterpartyInput[];
  // 결재선: 폼 approvers 스냅샷을 배열 순서대로 단계로 정규화한다(빈 배열이면 결재선 미생성).
  approvers: ApproverSnapshot[];
  // 첨부 파일 메타데이터(계약서/첨부/참고). role+sortOrder 로 정규화.
  files: FileInput[];
  // 참조수신자(cc). 폼 ccUsers/ccDepts/ccSecret 을 ccType+isSecret 으로 통합.
  references: CcRecipientInput[];
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

export interface GetContractRequest {
  id: string;
  // 조회자 id(gateway가 JWT sub 주입). 권한 없으면 비밀 참조자 숨김 + 상대회사 PII 마스킹.
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
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
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 상태 전이. ownerId 지정 시 함께 배정.
// 체결 품의 상신. 요청자 본인 + reviewDone + 결재선 비어있지 않음 검증은 서버가 수행.
export interface SubmitContractApprovalRequest {
  id: string;
  // gateway 가 JWT sub 주입.
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface SubmitContractApprovalResult {
  contract: ContractResponse;
  // gateway 가 SSE 허브로 push.
  notifications: PushNotification[];
}

/** 체결 처리 — sealManager 가 결재 완료된 계약을 signing → signed 로 확정한다.
 *  서명본 파일 승격 + signedAt 확정을 한 번에 처리한다. */
export interface CompleteSigningRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  /** 실제 서명 완료일(ISO 8601). */
  signedAt: string;
  /** 사전 업로드된 서명본 File.id. 필수 — 서버가 실제 바이트가 있는(storageKey not null) 파일을
   *  요구하므로 옵셔널이 아니다(client/server 비대칭 방지: 이 계층부터 게이트웨이·API 클라이언트·
   *  훅까지 전부 required 로 맞춘다). */
  fileId: string;
  /** 비고 — 감사 로그에만 남는다. */
  note?: string | null;
  tenantContext?: TenantContext;
}

export interface CompleteSigningResult {
  contract: ContractResponse;
}

/** 체결 완료 등록(registerAs=signed) 확정 — 생성자가 실제 서명본 업로드를 마친 뒤 호출한다.
 *  completeSigning 과 달리 결재 라인이 없다(애초에 결재를 건너뛰는 경로). unassigned →
 *  signed 로만 전이하며, role=signed + storageKey not null 인 File 이 있어야 통과한다. */
export interface FinalizeRegistrationRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  /** 실제 서명 완료일(ISO 8601). */
  signedAt: string;
  tenantContext?: TenantContext;
}

export interface FinalizeRegistrationResult {
  contract: ContractResponse;
}

/** 서명본 교체 — 체결된 계약의 서명본을 잘못 올렸을 때 법무팀이 새 파일로 바꾼다.
 *  기존 서명본은 지우지 않고 첨부로 내려 이력으로 남기고, 사유는 감사 로그에 기록한다. */
export interface ReplaceSignedFileRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  /** 새로 첨부(role=attach)한 서명본 File.id — 실제 바이트가 있어야 한다. */
  fileId: string;
  /** 교체 사유 — 감사 로그에 남는다. */
  reason: string;
  tenantContext?: TenantContext;
}

export interface ReplaceSignedFileResult {
  contract: ContractResponse;
}

/** 계약 삭제(소프트 삭제 — deletedAt). 담당자 배정 전 생성자 본인 또는 시스템 관리자.
 *  체결 결재 진행 중(signing)에는 막는다. 파일·변경 기록은 보존한다. */
export interface DeleteContractRequest {
  id: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  tenantContext?: TenantContext;
}

export interface DeleteContractResult {
  ok: true;
}

/** 로그인 화면 공개 통계 — 전체 테넌트 합계 숫자만(계약 내용·회사는 드러내지 않는다). */
export interface PublicStatsResponse {
  /** 법무 검토를 실제로 거친 계약 수 — 검토 완료 이후 단계 + 담당자 배정됨 + 삭제 안 됨. */
  reviewedContractCount: number;
}

// 계약 종료 사유(Prisma enum ContractClosedReason 과 같은 값).
export type ContractClosedReason = "completed" | "expired" | "renewed" | "terminated";
// 상태 변경으로 닫을 때 고를 수 있는 사유 — 갱신·해지는 전용 흐름에서만 정해진다.
export type StatusCloseReason = Extract<ContractClosedReason, "completed" | "expired">;

// 중도 해지 사유.
export type TerminationReason = "agreement" | "counterpartyBreach" | "ourCircumstance" | "other";

// AI 가 계약서에서 뽑은 자동갱신·해지 통지 조항(AiAnalysis kind "renewalTerms" 결과).
export interface RenewalTerms {
  autoRenewal: boolean;
  // 자동 연장 단위(예: "1년"). 없으면 null.
  renewalPeriod: string | null;
  // 만료 며칠 전까지 해지를 통지해야 하는지.
  noticeDays: number | null;
  // 통지 기한(YYYY-MM-DD).
  noticeDeadline: string | null;
  // 근거 조항(번호·제목).
  clause: string | null;
  summary: string;
}

// 만료 관리 "AI로 읽기" — 누른 사람의 AI 연동으로 자동갱신·해지 통지 조항을 추출한다.
export interface AnalyzeRenewalTermsRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  tenantContext?: TenantContext;
}

export interface TerminateContractRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  /** 해지일(YYYY-MM-DD) — 계약의 실제 종료일로 남는다. */
  terminatedOn: string;
  reason: TerminationReason;
  note?: string;
  /** 이 계약에 새로 첨부(role=attach)한 해지 합의서·통지서 File.id — 실제 바이트가 있어야 한다. */
  fileId: string;
  tenantContext?: TenantContext;
}

export interface TerminateContractResult {
  contract: ContractResponse;
}

export interface UpdateContractStatusRequest {
  id: string;
  status: ContractStatus;
  // closed 로 바꿀 때의 종료 사유. 없으면 completed(정상 종료).
  closedReason?: StatusCloseReason;
  ownerId?: string | null;
  // 조회자 id(gateway가 JWT sub 주입). user-service에서 전이/배정 권한 평가에 사용.
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
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
  userId: string | null;
  name: string;
  // 결재자 프로필 사진(API 기준 경로). 없으면 null.
  avatarUrl: string | null;
  dept: string;
  type: ApproverType;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
}

export interface ApprovalLineResponse {
  id: string;
  status: ApprovalStatus;
  steps: ApprovalStepResponse[];
  // 현재 차례 스텝 id(approve/agree 중 첫 pending). 확정된 라인이면 null.
  currentStepId: string | null;
  submittedById: string;
  submittedAt: string;
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

export type ContractStage = "new" | "renew" | "change" | "terminate";

// 다른 계약을 가리키는 짧은 요약(원 계약 / 이 계약에서 나온 갱신·변경·해지 계약).
export interface ContractLinkRef {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  stage: ContractStage;
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
  signedAt: string | null;
  // 종료 정보 — status 가 closed 일 때만 값이 있다.
  closedReason: ContractClosedReason | null;
  closedAt: string | null;
  closedNote: string | null;
  // 갱신·변경·해지 요청이 가리키는 원 계약 id.
  originContractId: string | null;
  // 원 계약 요약(삭제됐거나 없으면 null).
  originContract: ContractLinkRef | null;
  // 이 계약을 원 계약으로 삼은 갱신·변경·해지 계약들(삭제된 것 제외, 오래된 순).
  derivedContracts: ContractLinkRef[];
  schemaVersion: number;
  details: ContractDetailsV1;
  counterparties: CounterpartyResponse[];
  approvalLine: ApprovalLineResponse | null;
  // 상신 전 결재선(details.approvers). 상신하면 approvalLine(라인)이 생긴다.
  plannedApprovers: ApproverSnapshot[];
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
  periodEnd: string | null; // 계약 만료일(만료 관리 D-day)
  signedAt: string | null;
  createdById: string;
  updatedAt: string;
}

export interface ListContractsRequest {
  q?: string;
  status?: ContractStatus;
  // 콤마 분리 상태 목록(2단 그룹 필터). status 가 있으면 무시된다.
  statuses?: string;
  // 만료 기준(체결일 기준 X, periodEnd 기준). d90/d180=이내, expired=지남.
  expiry?: "d7" | "d30" | "d90" | "d180" | "expired";
  // 정렬 — 기본은 최근 수정 순, periodEnd 는 만료가 가까운 순(만료 관리).
  sort?: "updated" | "periodEnd";
  party?: string;
  categoryId?: string;
  // createdById 지정 시 "내 업무만"(gateway 가 JWT sub 주입).
  mineOf?: string;
  page?: number;
  pageSize?: number;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

export interface ListContractsResponse {
  items: ContractSummary[];
  total: number;
  page: number;
  pageSize: number;
}
