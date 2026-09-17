// 법률자문 — 요청자가 법무팀에 묻고(질의) 담당자가 답한다(회신).
// 흐름: 접수(received) → 법무 검토(reviewing) ⇄ 추가 질의(waitingRequester) → 회신 완료(answered) → 종결(closed)
import type { SecurityLevel } from "./contract.dto";
import type { TenantContext } from "./tenant.dto";

export type AdviceStatusTypes = "received" | "reviewing" | "waitingRequester" | "answered" | "closed";
export type AdviceRegionTypes = "domestic" | "overseas" | "both";
// followup: 담당자 추가 질의 · reply: 요청자 답변 · answer: 담당자 정식 회신
export type AdviceMessageKindTypes = "followup" | "reply" | "answer";

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
}

export interface CloseAdviceRequest extends AdviceViewerRequest {
  id: string;
}
