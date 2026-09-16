import { ADMIN_AUDIT_ACTIONS } from "@lawai/contracts";

const ACTION_LABELS: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  transition: "상태 변경",
  view: "열람",
  compare_report_download: "비교 보고서 내려받기",
  restore: "복구",
};

const TARGET_LABELS: Record<string, string> = {
  Contract: "계약",
  Tenant: "고객사",
  File: "파일",
};

export const AUDIT_ACTION_OPTIONS = [
  { value: "", label: "행위 전체" },
  ...ADMIN_AUDIT_ACTIONS.map((action) => ({
    value: action,
    label: ACTION_LABELS[action] ?? action,
  })),
];

export const getAuditActionLabel = (action: string): string => ACTION_LABELS[action] ?? action;

export const getAuditTargetLabel = (targetType: string): string =>
  TARGET_LABELS[targetType] ?? targetType;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * 세부 내용 한 줄 요약 — 무엇이 어떻게 바뀌었는지.
 * 상태 변경은 "검토 완료 → 체결 진행", 값 변경은 바뀐 항목 이름, 나머지는 담긴 값 그대로.
 */
export const getAuditDetailSummary = (detail: unknown): string => {
  if (!isRecord(detail)) return "-";

  const { from, to, before, after } = detail;
  if (typeof from === "string" && typeof to === "string") return `${from} → ${to}`;

  if (isRecord(before) && isRecord(after)) {
    const changed = Object.keys(after).filter(
      (key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]),
    );
    return changed.length > 0 ? `${changed.join(", ")} 바뀜` : "-";
  }

  const plain = Object.entries(detail).filter(
    ([, value]) => typeof value === "string" || typeof value === "number",
  );
  return plain.length > 0 ? plain.map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : "-";
};

// 표에 쓰는 절대 시각(초까지) — 같은 초에 여러 건이 쌓이는 걸 구분할 수 있게.
export const formatAuditTime = (iso: string): string =>
  new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "medium" });

// 날짜 입력값(Date) → 서버가 받는 ISO. 끝나는 날은 그날 23:59:59 까지 포함한다.
export const toRangeIso = (date: Date | null, edge: "start" | "end"): string | undefined => {
  if (!date) return undefined;
  const copy = new Date(date);
  if (edge === "start") copy.setHours(0, 0, 0, 0);
  else copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
};
