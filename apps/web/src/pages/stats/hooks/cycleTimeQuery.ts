import type { CycleTimeTargetTypes } from "@lawai/contracts";
import { getCycleTimeStats } from "../../../api/stats";
import { ALL_OWNERS } from "../cycleTimeView";

export const CYCLE_TIME_QUERY_KEY = "cycleTimeStats";

export interface CycleTimeQueryVars {
  targetType: CycleTimeTargetTypes;
  from: string;
  to: string;
  /** 빈 문자열이면 담당자 전체 */
  ownerId: string;
}

/**
 * 통계 조회의 key·queryFn 한 곳.
 *
 * `scope` 로 키를 갈라 두는 이유: 같은 키에 화면마다 다른 errorMode 를 붙이면
 * 캐시 항목의 meta 를 나중에 뜬 쪽이 덮어써서, 오류 처리가 마운트 순서에 좌우된다.
 * (홈 카드는 조용히 넘기고, 통계 화면은 오류를 보여줘야 한다.)
 */
export const createCycleTimeQuery = (vars: CycleTimeQueryVars, scope: "page" | "summary" = "page") => ({
  queryKey: [CYCLE_TIME_QUERY_KEY, scope, vars] as const,
  queryFn: () =>
    getCycleTimeStats({
      targetType: vars.targetType,
      from: vars.from,
      to: vars.to,
      ownerId: vars.ownerId === ALL_OWNERS ? undefined : vars.ownerId,
    }),
});
