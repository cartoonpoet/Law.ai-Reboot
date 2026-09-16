// 관리자 대시보드 응답 — 시스템 어드민이 한눈에 볼 통계.

export interface AdminStatsResponse {
  contracts: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  users: {
    total: number;
  };
  files: {
    total: number;
    bytesTotal: number; // R2 backing 이 있는(storageKey != null) 파일 기준
  };
  // 지난 7일 비교 보고서 다운로드 카운트 (compare_report_download audit action 수).
  recentCompareReports: number;
  // 응답 생성 시각(서버 기준 ISO). 프론트가 "방금 / X분 전" 표기 보조.
  generatedAt: string;
}

// 감사 로그에 기록되는 행위 — Prisma AuditAction enum 과 같은 값.
export const ADMIN_AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "transition",
  "view",
  "compare_report_download",
  "restore",
] as const;

export type AdminAuditActionTypes = (typeof ADMIN_AUDIT_ACTIONS)[number];

export interface AdminAuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetType: string;
  targetId: string;
  // 대상 이름(계약이면 계약 제목). 찾지 못하면 null — 화면은 targetId 로 대신 보여준다.
  targetTitle: string | null;
  tenantId: string;
  tenantName: string | null;
  detail: unknown;
  at: string; // ISO
}

export interface AdminAuditListRequest {
  limit?: number; // 기본 20, 최대 100
  offset?: number; // 기본 0 — 페이지 넘기기
  tenantId?: string;
  action?: string; // ADMIN_AUDIT_ACTIONS 중 하나. 모르는 값은 무시한다.
  actorId?: string;
  // 한 사람 이름 일부로 찾기(대소문자 무시). actorId 를 같이 주면 이름 검색이 우선한다.
  actorName?: string;
  targetId?: string;
  from?: string; // ISO — 이 시각부터(포함)
  to?: string; // ISO — 이 시각까지(포함)
}

export interface AdminAuditListResponse {
  items: AdminAuditEntry[];
  // 조건에 맞는 전체 건수(페이지 넘기기용).
  total: number;
}

// ─── Spec 3: 고객사 관리 ─────────────────────────────────────────────

export interface AdminTenantListItem {
  id: string;
  name: string;
  plan: import("./tenant.dto").TenantPlan;
  status: import("./tenant.dto").TenantStatus;
  trialEndsAt: string | null; // status=trial 일 때 체험판 만료 ISO. 아니면 null
  createdAt: string;
  memberCount: number;
  contractCount: number; // deletedAt null 기준
  lastActivityAt: string | null; // 해당 테넌트 AuditLog 최신 at
}

export interface AdminTenantListResponse {
  tenants: AdminTenantListItem[];
  totals: { tenants: number; users: number; contracts: number; trials: number };
}

export interface AdminTenantDetailRequest {
  tenantId: string;
}

export interface AdminTenantDetailResponse {
  tenant: AdminTenantListItem;
  stats: {
    memberCount: number;
    activeContracts: number; // signed 이전 상태(진행 중)
    signedContracts: number; // signed/fulfilling/closed
    storageBytes: number; // storageKey != null 파일 size 합
  };
  roleBreakdown: { role: import("../types").TenantRole; count: number }[];
  recentAudit: AdminAuditEntry[]; // 최근 10건, 이 테넌트만
}

export interface AdminTenantUpdateRequest {
  tenantId?: string; // gateway 가 path param 으로 주입
  plan?: import("./tenant.dto").TenantPlan;
  status?: import("./tenant.dto").TenantStatus;
  trialEndsAt?: string | null; // trial 전환 시 설정, null 로 해제
}

// ── 삭제된 계약 복구 (어드민 콘솔) ──────────────────────────────

export interface AdminDeletedContractItem {
  id: string;
  code: string;
  title: string;
  status: import("./contract.dto").ContractStatus;
  tenantId: string;
  tenantName: string;
  createdByName: string | null;
  // 가장 최근에 삭제한 사람(감사 기록 기준). 기록이 없으면 null.
  deletedByName: string | null;
  deletedAt: string;
}

export interface AdminDeletedContractListResponse {
  items: AdminDeletedContractItem[];
}

export interface AdminRestoreContractRequest {
  contractId: string;
  // gateway 가 JWT sub 를 주입.
  actorId: string;
}

export interface AdminRestoreContractResult {
  ok: true;
}
