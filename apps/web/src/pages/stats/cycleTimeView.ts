// 업무 통계 화면이 쓰는 계산 — 막대 비율·목표 초과 판정·라벨. 모두 순수 함수.
import type {
  CycleTimeMonthly,
  CycleTimeStage,
  CycleTimeStatsResponse,
  TenantMemberRow,
  TenantRole,
} from "@lawai/contracts";

/** 담당자 후보가 되는 역할 — 계약·자문의 법무 담당. (역할 이름 오타를 컴파일에서 잡으려고 타입을 건다) */
const OWNER_ROLES: TenantRole[] = ["inHouseCounsel", "contractManager", "outsideCounsel"];

export const ALL_OWNERS = "";

export interface StageBarTypes {
  status: CycleTimeStage["status"];
  label: string;
  targetDays: number;
  avgDays: number | null;
  /** 목표일까지 차오른 길이(%) */
  fillPercent: number;
  /** 목표를 넘은 만큼의 길이(%) */
  overPercent: number;
  isOver: boolean;
  openCount: number;
  overdueCount: number;
}

export interface MonthlyBarTypes {
  month: string;
  label: string;
  avgDays: number | null;
  doneCount: number;
  percent: number;
  isOver: boolean;
}

const toPercent = (value: number, scale: number): number =>
  scale <= 0 ? 0 : Math.round((value / scale) * 100);

/** 평균이 없으면(그 단계를 지나간 건이 없음) 0 으로 보지 말고 "아직 없음" 으로 다룬다. */
export const formatDays = (value: number | null): string => (value === null ? "아직 없음" : `${value}일`);

/** 막대 길이 기준 — 단계 평균·목표 중 가장 큰 값. 모든 단계를 같은 잣대로 비교하려고 쓴다. */
export const buildStageBars = (stages: CycleTimeStage[]): StageBarTypes[] => {
  const scale = Math.max(1, ...stages.map((stage) => Math.max(stage.avgDays ?? 0, stage.targetDays)));
  return stages.map((stage) => {
    const isOver = stage.avgDays !== null && stage.avgDays > stage.targetDays;
    const withinTarget = stage.avgDays === null ? 0 : Math.min(stage.avgDays, stage.targetDays);
    const over = isOver && stage.avgDays !== null ? stage.avgDays - stage.targetDays : 0;
    return {
      status: stage.status,
      label: stage.label,
      targetDays: stage.targetDays,
      avgDays: stage.avgDays,
      fillPercent: toPercent(withinTarget, scale),
      overPercent: toPercent(over, scale),
      isOver,
      openCount: stage.openCount,
      overdueCount: stage.overdueCount,
    };
  });
};

/** 2026-09 → 2026년 9월 */
export const formatMonthLabel = (month: string): string => {
  const [year, monthText] = month.split("-");
  return `${year}년 ${Number(monthText)}월`;
};

export const buildMonthlyBars = (monthly: CycleTimeMonthly[], targetDays: number): MonthlyBarTypes[] => {
  const scale = Math.max(1, targetDays, ...monthly.map((row) => row.avgDays ?? 0));
  return monthly.map((row) => ({
    month: row.month,
    label: formatMonthLabel(row.month),
    avgDays: row.avgDays,
    doneCount: row.doneCount,
    percent: toPercent(row.avgDays ?? 0, scale),
    isOver: row.avgDays !== null && row.avgDays > targetDays,
  }));
};

/** 전체 평균이 목표보다 얼마나 늦은지 — 큰 숫자 줄의 "목표 대비" 칸. */
export const getTotalDelta = (
  total: CycleTimeStatsResponse["total"],
): { text: string; isOver: boolean } => {
  if (total.avgDays === null) return { text: "아직 없음", isOver: false };
  const diff = Math.round((total.avgDays - total.targetDays) * 10) / 10;
  if (diff > 0) return { text: `${diff}일 초과`, isOver: true };
  if (diff < 0) return { text: `${Math.abs(diff)}일 빠름`, isOver: false };
  return { text: "목표와 같음", isOver: false };
};

/** 목표를 가장 많이 넘긴 단계 — 어디서 시간이 새는지 한 줄로 알려주려고 쓴다. */
export const getSlowestStage = (stages: CycleTimeStage[]): CycleTimeStage | null => {
  const overStages = stages.filter((stage) => stage.avgDays !== null && stage.avgDays > stage.targetDays);
  if (overStages.length === 0) return null;
  const getOvershoot = (stage: CycleTimeStage): number => (stage.avgDays ?? 0) / Math.max(1, stage.targetDays);
  return overStages.reduce((slowest, stage) => (getOvershoot(stage) > getOvershoot(slowest) ? stage : slowest));
};

/** 지금 지연으로 멈춰 있는 건수 합. */
export const getOverdueTotal = (stages: CycleTimeStage[]): number =>
  stages.reduce((sum, stage) => sum + stage.overdueCount, 0);

/** 기록이 막 시작돼 아무 숫자도 없는 상태 — EmptyState 를 보여줄 때. */
export const isEmptyStats = (data: CycleTimeStatsResponse): boolean =>
  data.total.doneCount === 0 &&
  data.overdue.length === 0 &&
  data.monthly.length === 0 &&
  data.stages.every((stage) => stage.avgDays === null && stage.openCount === 0);

/** 담당자 필터 옵션 — 법무 담당 역할만, 이름 순. */
export const getOwnerOptions = (members: TenantMemberRow[]): { value: string; label: string }[] => [
  { value: ALL_OWNERS, label: "담당자 전체" },
  ...members
    .filter((member) => OWNER_ROLES.includes(member.role))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((member) => ({ value: member.userId, label: member.name })),
];

/** 지연 목록 클릭 시 갈 상세 화면. */
export const getTargetPath = (targetType: CycleTimeStatsResponse["targetType"], targetId: string): string =>
  targetType === "contract" ? `/contract/${targetId}` : `/advice/${targetId}`;

export type DaysToneTypes = "over" | "within" | "none";

/** 소요일 숫자 색 — 값이 없으면 흐리게, 목표를 넘겼으면 경고색. */
export const getDaysTone = (value: { avgDays: number | null; isOver: boolean }): DaysToneTypes => {
  if (value.avgDays === null) return "none";
  return value.isOver ? "over" : "within";
};

/** 화면 맨 위 한 줄 요약 — 어디서 시간이 새는지 먼저 알려준다. */
export const getHeadline = (data: CycleTimeStatsResponse): { text: string; isWarning: boolean } => {
  const slowest = getSlowestStage(data.stages);
  if (slowest !== null) {
    return {
      text: `시간이 가장 많이 새는 단계는 "${slowest.label}" 이에요 — 평균 ${slowest.avgDays}일, 목표는 ${slowest.targetDays}일이에요.`,
      isWarning: true,
    };
  }
  if (data.total.avgDays !== null) {
    return { text: `모든 단계가 목표 안에 있어요. 전체 평균은 ${data.total.avgDays}일이에요.`, isWarning: false };
  }
  return { text: "끝난 건이 아직 없어 평균을 낼 수 없어요. 지금 멈춰 있는 건만 아래에서 볼 수 있어요.", isWarning: false };
};
