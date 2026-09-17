// 법률자문 — 요청자가 법무팀에 묻고(질의) 담당자가 답한다(회신).
// 흐름: (요청 결재) → 접수(received) → 법무 검토(reviewing) ⇄ 추가 질의(waitingRequester) → (회신 결재) → 회신 완료(answered) → 종결(closed)
// 요청 결재·회신 결재는 결재선에 결재·합의 단계가 있을 때만 거친다(공용 ApprovalLine, targetType advice_request / advice_answer).
import type { ApprovalLineDto } from "./approval.dto";
import type { PushNotification } from "./comment.dto";
import type { ApproverSnapshot, SecurityLevel } from "./contract.dto";
import type { TenantContext } from "./tenant.dto";

export type AdviceStatusTypes =
  | "requestApproval"
  | "requestRejected"
  | "received"
  | "reviewing"
  | "waitingRequester"
  | "answerApproval"
  | "answered"
  | "closed";

export const ADVICE_APPROVAL_TARGET = {
  REQUEST: "advice_request",
  ANSWER: "advice_answer",
} as const;
export type AdviceRegionTypes = "domestic" | "overseas" | "both";
// followup: 담당자 추가 질의 · reply: 요청자 답변 · answer: 담당자 정식 회신
export type AdviceMessageKindTypes = "followup" | "reply" | "answer";
// 결재를 거치는 회신은 승인 전까지 요청자에게 보이지 않는다.
export type AdviceMessageStateTypes = "published" | "pendingApproval" | "rejected";

export interface AdviceRef {
  id: string;
  name: string;
}

// 화면에 보여줄 사람 — 지워진 사용자는 name 이 null.
export interface AdvicePerson {
  id: string;
  name: string | null;
  dept: string | null;
}

// 조회 조건으로 쓰지 않는 입력값(참조수신자·관련 프로젝트·상대방).
export interface AdviceDetails {
  ccUsers: AdviceRef[];
  ccDepts: AdviceRef[];
  // 비밀 참조 — 법무팀·작성자에게만 내려간다.
  ccSecret: AdviceRef[];
  project: AdviceRef | null;
  counterparty: string;
}

export interface AdviceSummary {
  id: string;
  code: string;
  title: string;
  status: AdviceStatusTypes;
  securityLevel: SecurityLevel;
  categories: string[];
  region: AdviceRegionTypes;
  requester: AdvicePerson;
  owner: AdvicePerson | null;
  dueDate: string | null; // ISO
  answeredAt: string | null; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface AdviceMessageDto {
  id: string;
  kind: AdviceMessageKindTypes;
  state: AdviceMessageStateTypes;
  body: string;
  author: AdvicePerson;
  createdAt: string; // ISO
}

// 보는 사람 기준으로 지금 할 수 있는 일 — 화면은 이 값으로 버튼을 보이고 숨긴다.
export interface AdvicePermissions {
  canAssign: boolean;
  canFollowup: boolean;
  canAnswer: boolean;
  canReply: boolean;
  canClose: boolean;
  // 요청 결재가 반려된 자문을 결재선을 고쳐 다시 올릴 수 있는지(작성자).
  canResubmitRequest: boolean;
}

export interface AdviceResponse extends AdviceSummary {
  countries: string[];
  background: string;
  question: string;
  etcRequest: string | null;
  details: AdviceDetails;
  createdBy: AdvicePerson;
  closedAt: string | null; // ISO
  messages: AdviceMessageDto[];
  permissions: AdvicePermissions;
  // 가장 최근 요청 결재·회신 결재(없으면 null).
  requestApproval: ApprovalLineDto | null;
  answerApproval: ApprovalLineDto | null;
}

// 결재 상신이 함께 일어나는 동작의 결과 — 게이트웨이가 알림을 실시간(SSE)으로 밀고 advice 만 돌려준다.
export interface AdviceMutationResult {
  advice: AdviceResponse;
  notifications: PushNotification[];
}

interface AdviceViewerRequest {
  viewerId: string;
  tenantContext: TenantContext;
}

export interface CreateAdviceRequest extends AdviceViewerRequest {
  title: string;
  categories: string[];
  securityLevel: SecurityLevel;
  requesterId: string;
  // 요청할 때 담당자를 정하면 바로 법무 검토로 시작한다.
  ownerId: string | null;
  region: AdviceRegionTypes;
  countries: string[];
  background: string;
  question: string;
  etcRequest: string | null;
  dueDate: string | null; // YYYY-MM-DD
  details: AdviceDetails;
  // 요청 결재선(기안자 포함). 결재·합의 단계가 없으면 결재 없이 바로 접수된다.
  approvers: ApproverSnapshot[];
}

export interface ListAdvicesRequest extends AdviceViewerRequest {
  // 쉼표로 이은 상태 목록(비면 전체).
  statuses?: string;
  q?: string;
  category?: string;
  // 법무팀은 내가 담당한 건, 그 외는 내가 요청한 건.
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListAdvicesResponse {
  items: AdviceSummary[];
  total: number;
  page: number;
  pageSize: number;
  // 상태 필터를 빼고 센 상태별 건수(그룹 탭 숫자).
  counts: Record<AdviceStatusTypes, number>;
}

export interface GetAdviceRequest extends AdviceViewerRequest {
  id: string;
}

export interface AssignAdviceRequest extends AdviceViewerRequest {
  id: string;
  ownerId: string;
}

export interface AddAdviceMessageRequest extends AdviceViewerRequest {
  id: string;
  kind: AdviceMessageKindTypes;
  body: string;
  // 회신(answer) 결재선. 결재·합의 단계가 있으면 회신 결재를 거친다.
  approvers?: ApproverSnapshot[];
}

export interface ResubmitAdviceRequestApprovalRequest extends AdviceViewerRequest {
  id: string;
  approvers: ApproverSnapshot[];
}

export interface CloseAdviceRequest extends AdviceViewerRequest {
  id: string;
}
