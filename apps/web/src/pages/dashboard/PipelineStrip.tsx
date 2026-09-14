import { Icon } from "@lawkit/ui";
import { cx } from "../contract/cx";
import type { FlowStage } from "./dashboardTypes";
import * as css from "./dashboard.css";

const MAX_BAR = 26;

interface PipelineStripProps {
  stages: FlowStage[];
  isLoading: boolean;
}

/**
 * 계약 검토 파이프라인 — 상태별 실제 진행 건수. 가장 많이 쌓인 단계를 강조한다.
 * 막대 차오름·흐름 점선·강조 깜빡임 애니메이션(움직임 줄이기 설정이면 끔).
 */
export const PipelineStrip = ({ stages, isLoading }: PipelineStripProps) => {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className={css.card} aria-label="계약 검토 파이프라인">
      <header className={css.cardHead}>
        <span className={css.cardTitle}>
          <Icon name="fileText" size="sm" className={css.cardTitleIcon} />
          계약 검토 파이프라인
        </span>
        <span className={css.cardMeta}>{isLoading ? "불러오는 중" : `진행 중 ${total}건`}</span>
      </header>

      {/* 데이터가 오면 key 가 바뀌어 등장 애니메이션을 다시 재생 */}
      <div key={isLoading ? "loading" : "loaded"} className={css.stageRow}>
        <span className={css.flowTrack} aria-hidden />
        {stages.map((stage, i) => (
          <div key={stage.status} className={cx(css.stageWrap, css.stageDelayVariants[String(i)])}>
            <div className={cx(css.stage, stage.isBusiest && css.stageBusiest)}>
              {stage.isBusiest && <span className={css.busiestTag}>가장 많음</span>}
              <div className={css.stageLabel}>{stage.label}</div>
              <div className={css.barBox}>
                <div
                  className={cx(
                    css.barTone[stage.tone],
                    css.barHeight[String(Math.round((stage.count / maxCount) * MAX_BAR))],
                    !stage.isBusiest && css.barFaint,
                  )}
                />
              </div>
              <div className={cx(css.stageCount, stage.isBusiest && css.stageCountBusiest)}>{isLoading ? "–" : stage.count}</div>
              <div className={css.stageUnit}>건</div>
            </div>
            {i < stages.length - 1 && <Icon name="chevronRight" size="sm" className={css.chevron} />}
          </div>
        ))}
      </div>
    </section>
  );
};
