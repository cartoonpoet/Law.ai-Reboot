// 문의·상담 — 사용자가 AI 비서에서 문의를 남기면 스레드가 생기고, 관리자가 콘솔에서 답한다.
// 답변은 알림(support_reply)으로 만들어져 게이트웨이가 SSE 로 바로 밀어준다.
import type { PushNotification } from "./comment.dto";
import type { TenantContext } from "./tenant.dto";

export type SupportStatusTypes = "open" | "answered" | "closed";
export type SupportAuthorRoleTypes = "user" | "admin";

// 오류 문의일 때 화면이 자동으로 담아 보내는 정보(사용자가 쓴 내용과 별개).
export interface SupportContext {
  // 문의한 화면 주소(예: "/contract/abc").
  path?: string;
  // 화면 이름(예: "계약 상세").
  screen?: string;
  // 오류 메시지(서버가 준 사유 또는 화면이 잡은 오류).
  errorMessage?: string;
  // 오류 종류(권한 없음·찾을 수 없음·연결 끊김·일시적 오류).
  errorKind?: string;
}

export interface SupportMessageDto {
  id: string;
  authorId: string;
  authorRole: SupportAuthorRoleTypes;
  authorName: string | null;
  body: string;
  createdAt: string; // ISO
}

export interface SupportThreadDto {
  id: string;
  subject: string;
  status: SupportStatusTypes;
  context: SupportContext | null;
  lastMessageAt: string; // ISO
  createdAt: string; // ISO
  // 목록에서 보여줄 마지막 메시지 한 줄.
  lastMessagePreview: string;
  // 마지막 메시지를 누가 썼는지 — 답변이 왔는지 한눈에 보려고.
  lastMessageRole: SupportAuthorRoleTypes;
}

export interface SupportThreadDetail extends SupportThreadDto {
  messages: SupportMessageDto[];
}

export interface CreateSupportThreadRequest {
  userId: string;
  tenantContext: TenantContext;
  subject: string;
  body: string;
  context?: SupportContext;
}

export interface ListMySupportThreadsRequest {
  userId: string;
  tenantContext: TenantContext;
}

export interface ListMySupportThreadsResponse {
  threads: SupportThreadDto[];
  // 아직 안 읽은 답변 수가 아니라, 답변이 와서 열려 있는 문의 수(비서 탭 배지용).
  answeredCount: number;
}

export interface GetSupportThreadRequest {
  userId: string;
  threadId: string;
  tenantContext: TenantContext;
}

export interface AddSupportMessageRequest {
  userId: string;
  threadId: string;
  body: string;
  tenantContext: TenantContext;
}

// 관리자 콘솔 — 전 고객사 문의함.
export interface AdminSupportListRequest {
  status?: SupportStatusTypes;
  limit?: number; // 기본 20, 최대 100
  offset?: number;
}

export interface AdminSupportThreadRow extends SupportThreadDto {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  tenantId: string;
  tenantName: string | null;
}

export interface AdminSupportListResponse {
  items: AdminSupportThreadRow[];
  total: number;
  // 답변 대기 중인 문의 수(콘솔 배지용).
  openCount: number;
}

export interface AdminGetSupportThreadRequest {
  threadId: string;
}

export interface AdminSupportThreadDetail extends AdminSupportThreadRow {
  messages: SupportMessageDto[];
}

export interface AdminReplySupportRequest {
  threadId: string;
  actorId: string;
  body: string;
  // 답변하면서 문의를 종료할지.
  close?: boolean;
}

// 관리자 답변 결과 — notifications 는 게이트웨이가 SSE 로 밀어 문의한 사람에게 바로 보여준다.
export interface AdminReplySupportResult {
  thread: AdminSupportThreadDetail;
  notifications: PushNotification[];
}
