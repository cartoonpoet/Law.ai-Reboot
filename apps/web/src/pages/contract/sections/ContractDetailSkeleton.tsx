import { Skeleton } from "@lawkit/ui";
import { LAYOUT, page } from "../contractDetail.css";
import * as css from "./contractDetailSkeleton.css";

/* =========================================================================
 * ContractDetailSkeleton — 재설계된 상세 레이아웃의 로딩 placeholder.
 * lawkit Skeleton(rect/circle/text)으로 hero / at-a-glance(6셀) / StepBar /
 * 좌측 카드 스택 / 우측 레일 패널 형태를 모사한다.
 * 레이아웃 치수는 contractDetail.css.ts 의 LAYOUT export 에서 단일 도출(드리프트 방지).
 * 컴포넌트 렌더만 — useEffect/상태 불필요. 인라인 0(치수는 Skeleton props).
 * ======================================================================= */

// 카드 골격(헤더 + 본문 텍스트 줄)
function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="text" width={140} />
      </div>
      <div className={css.cardBody}>
        <Skeleton variant="text" lines={lines} />
      </div>
    </section>
  );
}

// facts 카드(2열 라벨/값 그리드)
function FactsCardSkeleton({ rows = 6 }: { rows?: number }) {
  const cells = Array.from({ length: rows }, (_, i) => i);
  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="text" width={120} />
      </div>
      <div className={css.cardBody}>
        <div className={css.facts}>
          {cells.map((i) => (
            <div key={i} className={css.factCell}>
              <Skeleton variant="text" width={64} height={11} />
              <Skeleton variant="rect" width="70%" height={16} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContractDetailSkeleton() {
  const glanceCells = Array.from({ length: LAYOUT.glanceColumns }, (_, i) => i);
  const stepDots = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className={page}>
      {/* backlink */}
      <Skeleton variant="text" width={120} height={12} />

      {/* hero: 제목 라인 + 메타 라인 */}
      <div className={css.hero}>
        <div className={css.heroRow}>
          <Skeleton variant="circle" width={18} height={18} />
          <Skeleton variant="rect" width={320} height={26} />
          <Skeleton variant="rect" width={72} height={22} />
        </div>
        <Skeleton variant="text" width={280} height={13} />
      </div>

      {/* at-a-glance(6셀) */}
      <div className={css.glance}>
        {glanceCells.map((i) => (
          <div key={i} className={css.glanceCell}>
            <Skeleton variant="text" width={56} height={10} />
            <Skeleton variant="rect" width="80%" height={16} />
          </div>
        ))}
      </div>

      {/* 진행 게이지: 링 + 현재 단계 텍스트 + 단계 막대 */}
      <section className={css.card}>
        <div className={css.cardBody}>
          <div className={css.lifecycle}>
            <Skeleton variant="circle" width={104} height={104} />
            <div className={css.lifecycleInfo}>
              <Skeleton variant="text" width={120} height={10} />
              <Skeleton variant="rect" width={160} height={24} />
              <Skeleton variant="text" width={260} height={13} />
              <div className={css.lifecycleDots}>
                {stepDots.map((i) => (
                  <Skeleton key={i} variant="rect" width={22} height={5} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2컬럼: 좌 카드 스택 / 우 레일 패널 */}
      <div className={css.railGrid}>
        <div className={css.stack}>
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
          <FactsCardSkeleton rows={6} />
          <FactsCardSkeleton rows={4} />
          <CardSkeleton lines={3} />
        </div>
        <div className={css.stack}>
          <CardSkeleton lines={4} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </div>
  );
}
