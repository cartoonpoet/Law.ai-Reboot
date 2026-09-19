import type { TenantContext } from "./tenant.dto";

/** 소요시간을 재는 대상. 나중에 송무 사건이 붙으면 늘린다. */
export type CycleTimeTargetTypes = "contract" | "advice";

export interface CycleTimeStatsRequest {
  tenantContext: TenantContext;
  viewerId: string;
  targetType: CycleTimeTargetTypes;
  /** YYYY-MM-DD (포함) — 없으면 5개월 전 1일부터 오늘까지 */
  from?: string;
  /** YYYY-MM-DD (포함) */
  to?: string;
  /** 담당자 한 명만 볼 때 */
  ownerId?: string;
}

/** 한 단계(그 상태에 머문 시간) */
export interface CycleTimeStage {
  /** 상태 값 그대로 (예: legalReview) */
  status: string;
  label: string;
  /** 이 일수를 넘기면 지연으로 본다 */
  targetDays: number;
  /** 이 단계를 지나간 건의 평균 일수 — 지나간 건이 없으면 null */
  avgDays: number | null;
  medianDays: number | null;
  /** 기간 안에 이 단계를 빠져나간 "구간" 수 — 같은 건이 한 단계를 두 번 거치면 2로 센다 */
  doneCount: number;
  /** 지금 이 단계에 머물러 있는 건수 — 기간과 무관하다 */
  openCount: number;
  /** 지금 머물러 있으면서 목표일을 넘긴 건수 — 기간과 무관하다 */
  overdueCount: number;
}

/** 목표일을 넘겨 멈춰 있는 건 */
export interface CycleTimeOverdueRow {
  targetId: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  /** 이 상태에 머문 일수 */
  days: number;
  targetDays: number;
  ownerId: string | null;
  ownerName: string | null;
}

/** 월별 추이 — 그 달에 끝난 건 기준 */
export interface CycleTimeMonthly {
  /** YYYY-MM */
  month: string;
  avgDays: number | null;
  doneCount: number;
}

/** 담당자별 — 그 기간에 끝낸 건 기준 */
export interface CycleTimeOwner {
  ownerId: string;
  ownerName: string | null;
  doneCount: number;
  avgDays: number | null;
}

export interface CycleTimeStatsResponse {
  targetType: CycleTimeTargetTypes;
  from: string;
  to: string;
  /** 처음부터 끝까지(접수 → 체결/회신) */
  total: {
    label: string;
    targetDays: number;
    avgDays: number | null;
    medianDays: number | null;
    /** 기간 안에 끝난 건수 */
    doneCount: number;
    /** 아직 안 끝난 건 — 기간과 무관하다 */
    openCount: number;
  };
  stages: CycleTimeStage[];
  monthly: CycleTimeMonthly[];
  owners: CycleTimeOwner[];
  overdue: CycleTimeOverdueRow[];
  /** 기록이 시작된 시각 — 이 앞의 소요시간은 알 수 없다는 걸 화면에 밝힌다 */
  recordedSince: string | null;
}
