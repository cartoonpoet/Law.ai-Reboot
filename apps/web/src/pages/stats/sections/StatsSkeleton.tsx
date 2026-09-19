import { Skeleton } from "@lawkit/ui";
import * as css from "../stats.css";

/** 첫 조회 동안의 자리표시 — 상세 성격의 화면이라 스피너 대신 스켈레톤. */
export const StatsSkeleton = () => (
  <div className={css.skeletonStack}>
    <Skeleton height={64} />
    <Skeleton height={104} />
    <Skeleton height={280} />
    <Skeleton height={180} />
  </div>
);
