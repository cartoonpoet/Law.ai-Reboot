import { Skeleton } from "@lawkit/ui";
import * as scss from "./contractDetailSkeleton.css";

// 상세 로딩 placeholder — 헤더/스테퍼/검토요약·리스크/사이드바 패널 형태를 모사.
// [[loading-state-convention]] 상세=Skeleton(목록=Spinner). 인라인 0(className만).
const FACT_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6"];
const STEP_KEYS = ["s1", "s2", "s3", "s4", "s5"];

export function ContractDetailSkeleton() {
  return (
    <div className={scss.root} data-testid="contract-detail-skeleton">
      <div className={scss.headerLine}>
        <Skeleton variant="circle" width={18} height={18} />
        <Skeleton width={320} height={24} />
        <Skeleton width={88} height={22} />
      </div>

      <div className={scss.stepperPanel}>
        {STEP_KEYS.map((k) => (
          <Skeleton key={k} variant="circle" width={22} height={22} />
        ))}
      </div>

      <div className={scss.layout}>
        <div className={scss.mainColumn}>
          <div className={scss.panel}>
            <div className={scss.factGrid}>
              {FACT_KEYS.map((k) => (
                <div key={k} className={scss.factCell}>
                  <Skeleton width={70} height={11} />
                  <Skeleton width="80%" height={14} />
                </div>
              ))}
            </div>
          </div>
          <div className={scss.panel}>
            <Skeleton variant="text" lines={4} />
          </div>
        </div>

        <div className={scss.sideColumn}>
          <div className={scss.panel}>
            <Skeleton variant="text" lines={3} />
          </div>
          <div className={scss.panel}>
            <Skeleton variant="text" lines={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
