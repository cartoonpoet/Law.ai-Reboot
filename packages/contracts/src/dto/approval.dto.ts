import type { TenantContext } from "./tenant.dto";
import type {
  ApproverType,
  ApprovalStatus,
  StepStatus,
} from "./contract.dto";
import type { PushNotification } from "./comment.dto";

// 결재 스텝 DTO. draft 는 상신 시 approved 로 생성, refer 는 승인 대상 아님(알림 전용).
export interface ApprovalStepDto {
  id: string;
  stepOrder: number;
  userId: string | null;
  name: string;
  dept: string;
  type: ApproverType;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
}

// 결재 라인 DTO(범용). targetType 은 "contract" 등 대상 도메인 식별자.
export interface ApprovalLineDto {
  id: string;
  targetType: string;
  targetId: string;
  title: string;
  status: ApprovalStatus;
  submittedById: string;
  submittedByName: string;
  submittedAt: string;
  decidedAt: string | null;
  steps: ApprovalStepDto[];
  // 현재 차례(approve/agree 중 stepOrder 최소 pending). 없으면 null(확정됨).
  currentStepId: string | null;
}

// 승인/반려. 대상 스텝은 서버가 현재 차례로 파생(stepId 미수신 — 경합·위조 차단).
export interface DecideApprovalRequest {
  lineId: string;
  decision: "approve" | "reject";
  comment?: string;
  // gateway 가 JWT sub 주입.
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface DecideApprovalResult {
  line: ApprovalLineDto;
  // gateway 가 SSE 허브로 push.
  notifications: PushNotification[];
}

export interface ApprovalInboxRequest {
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface ApprovalInboxItem {
  lineId: string;
  targetType: string;
  targetId: string;
  // 대상 문서 번호(계약 관리번호 등). 대상 도메인 핸들러가 없으면 null.
  targetCode: string | null;
  title: string;
  submittedById: string;
  submittedByName: string;
  submittedByDept: string;
  // 승인 필요(approve/agree) 스텝 기준 0-based 내 위치.
  myStepOrder: number;
  // 승인 필요(approve/agree) 스텝 수.
  totalSteps: number;
  myType: ApproverType;
  submittedAt: string;
  lineStatus: ApprovalStatus;
  myStatus: StepStatus;
  myDecidedAt: string | null;
}

export interface ApprovalInboxResponse {
  // 내 차례인 진행 중 라인.
  pending: ApprovalInboxItem[];
  // 내 결재 단계가 남아 있지만 아직 앞 단계가 진행 중인 라인(내 차례 예정).
  upcoming: ApprovalInboxItem[];
  // 내가 승인/반려한 라인(최근 30일).
  processed: ApprovalInboxItem[];
}

export interface GetActiveApprovalRequest {
  targetType: string;
  targetId: string;
  tenantContext?: TenantContext;
}

export interface GetActiveApprovalResponse {
  // 최신 라인(submittedAt desc). 없으면 null.
  line: ApprovalLineDto | null;
  // 이전 라인 수(반려 이력 등).
  historyCount: number;
}
