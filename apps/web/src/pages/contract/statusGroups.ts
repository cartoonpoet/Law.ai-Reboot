import type { ContractStatus } from "@lawai/contracts";

/**
 * 상태 필터 1단 — 라이프사이클 단계 그룹.
 * 칩 한 줄에 상태를 전부 늘어놓으면 상태가 늘 때마다 줄이 터진다(현재 10종).
 * 그룹은 라이프사이클이라 개수가 고정이고, 새 상태는 해당 그룹 안으로만 들어간다.
 */
export const STATUS_GROUPS = {
  all: [],
  review: [
    "draft",
    "unassigned",
    "assigning",
    "legalReview",
    "requesterReview",
    "reviewDone",
  ],
  sign: ["signing", "signed"],
  fulfil: ["fulfilling"],
  closed: ["closed"],
} as const satisfies Record<string, readonly ContractStatus[]>;

export type StatusGroup = keyof typeof STATUS_GROUPS;

export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  all: "전체",
  review: "검토",
  sign: "체결",
  fulfil: "이행",
  closed: "종료",
};

export const STATUS_GROUP_ORDER: StatusGroup[] = [
  "all",
  "review",
  "sign",
  "fulfil",
  "closed",
];

export const getGroupStatuses = (group: StatusGroup): ContractStatus[] => [
  ...STATUS_GROUPS[group],
];

// 그룹 탭 숫자 — 그룹에 속한 상태 건수의 합(전체는 모든 상태). 건수를 아직 못 받았으면 null.
export const getGroupCount = (
  counts: Record<ContractStatus, number> | undefined,
  group: StatusGroup,
): number | null => {
  if (!counts) return null;
  const statuses = group === "all" ? (Object.keys(counts) as ContractStatus[]) : getGroupStatuses(group);
  return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
};
