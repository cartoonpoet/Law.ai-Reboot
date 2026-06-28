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

export interface AdminAuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetType: string;
  targetId: string;
  detail: unknown;
  at: string; // ISO
}

export interface AdminAuditListRequest {
  limit?: number; // 기본 20, 최대 100
}

export interface AdminAuditListResponse {
  items: AdminAuditEntry[];
}
