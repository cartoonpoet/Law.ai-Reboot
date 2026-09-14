import { T } from "../../design/tokens";

// D-day 표기 — 당일·3일 이내 빨강, 7일 이내 주황, 지난 건 흐리게.
export type DdayToneTypes = "danger" | "warning" | "muted" | "faint";

export const getDday = (daysLeft: number): { label: string; tone: DdayToneTypes } => {
  if (daysLeft === 0) return { label: "D-DAY", tone: "danger" };
  if (daysLeft < 0) return { label: `D+${-daysLeft}`, tone: "faint" };
  if (daysLeft <= 3) return { label: `D-${daysLeft}`, tone: "danger" };
  if (daysLeft <= 7) return { label: `D-${daysLeft}`, tone: "warning" };
  return { label: `D-${daysLeft}`, tone: "muted" };
};

// 레거시 — 계약 목록(listColumns)이 인라인 색으로 쓴다. 목록을 토큰 스타일로 옮기면 getDday 로 교체.
export function dday(n: number): { t: string; c: string } {
  if (n === 0) return { t: "D-DAY", c: T.danger };
  if (n < 0) return { t: `D+${-n}`, c: T.faint };
  return { t: `D-${n}`, c: n <= 3 ? T.danger : n <= 7 ? T.warning : T.muted };
}
