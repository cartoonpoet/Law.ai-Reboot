import { Button, Icon } from "@lawkit/ui";
import { cx } from "../../contract/cx";
import { AiNote } from "./AiNote";
import { FLOW_STAGES, PIPELINE_AI } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const MAX_COUNT = Math.max(...FLOW_STAGES.map((s) => s.count));
const MAX_BAR = 26;

/** 계약 검토 파이프라인(개선) — 현재 모양 그대로 두고, 아래에 AI 병목 분석 한 줄 + 추천 액션을 붙였다. */
export const ImprovedPipeline = () => (
  <section className={css.card} aria-label="계약 검토 파이프라인">
    <header className={css.cardHead}>
      <span className={css.cardTitle}>
        <Icon name="fileText" size="sm" className={css.cardTitleIcon} />
        계약 검토 파이프라인
      </span>
      <span className={css.cardMeta}>오늘 09:42 기준 · 160건 진행 중</span>
    </header>

    <div className={css.stageRow}>
      {FLOW_STAGES.map((stage, i) => (
        <div key={stage.id} className={css.stageWrap}>
          <div className={cx(css.stage, stage.bottleneck && css.stageBottleneck[stage.tone])}>
            {stage.bottleneck && <span className={cx(css.bottleneckTag, css.countTone[stage.tone])}>병목</span>}
            <div className={css.stageLabel}>{stage.label}</div>
            <div className={css.barBox}>
              <div
                className={cx(
                  css.barTone[stage.tone],
                  css.barHeight[String(Math.round((stage.count / MAX_COUNT) * MAX_BAR))],
                  !stage.bottleneck && css.barFaint,
                )}
              />
            </div>
            <div className={cx(css.stageCount, css.countTone[stage.bottleneck ? stage.tone : "neutral"])}>{stage.count}</div>
            <div className={css.stageUnit}>건</div>
          </div>
          {i < FLOW_STAGES.length - 1 && <Icon name="chevronRight" size="sm" className={css.chevron} />}
        </div>
      ))}
    </div>

    <div className={css.pipelineAi}>
      <AiNote>{PIPELINE_AI.text}</AiNote>
      <Button size="small" variant="outline" color="secondary">
        {PIPELINE_AI.action}
      </Button>
    </div>
  </section>
);
