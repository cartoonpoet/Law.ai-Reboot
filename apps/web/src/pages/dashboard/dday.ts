import { T } from "../../design/tokens";

export function dday(n: number): { t: string; c: string } {
  if (n === 0) return { t: "D-DAY", c: T.danger };
  if (n < 0) return { t: `D+${-n}`, c: T.faint };
  return { t: `D-${n}`, c: n <= 3 ? T.danger : n <= 7 ? T.warning : T.muted };
}
