import type { TenantPlan, TenantRole, TenantStatus } from "@lawai/contracts";

const ROLE_LABELS: Record<TenantRole, string> = {
  general: "일반",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "날인담당자",
};

export const PLAN_LABELS: Record<TenantPlan, string> = {
  enterprise: "Enterprise",
  pro: "Pro",
  starter: "Starter",
};

export const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "사용 중",
  trial: "체험판",
  suspended: "정지",
};

export const getTenantRoleLabelAdmin = (role: TenantRole): string => ROLE_LABELS[role];

// 남은 일수(D-day). 만료 지났으면 "만료됨".
export const getTrialDday = (trialEndsAt: string | null): string | null => {
  if (!trialEndsAt) return null;
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "만료됨" : `${days}일 남음`;
};

export const formatRelative = (iso: string | null): string => {
  if (!iso) return "-";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;
  return `${Math.floor(diffMin / 1440)}일 전`;
};
